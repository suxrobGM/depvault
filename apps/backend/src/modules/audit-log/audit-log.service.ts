import { singleton } from "tsyringe";
import { ForbiddenError, NotFoundError } from "@/common/errors";
import { logger } from "@/common/logger/logger";
import { PrismaClient, type AuditAction, type AuditResourceType } from "@/generated/prisma";
import type { PaginatedResponse } from "@/types/response";
import type { AuditLogResponse } from "./audit-log.schema";

export interface CreateAuditLogParams {
  userId?: string;
  projectId: string;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  ipAddress: string;
  metadata?: Record<string, string | number | boolean | null>;
}

@singleton()
export class AuditLogService {
  constructor(private readonly prisma: PrismaClient) {}

  async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          projectId: params.projectId,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          ipAddress: params.ipAddress,
          metadata: params.metadata,
        },
      });
    } catch (error) {
      logger.error({ error, action: params.action }, "Failed to write audit log");
    }
  }

  async list(
    projectId: string,
    userId: string,
    filters: {
      action?: AuditAction;
      resourceType?: AuditResourceType;
      from?: string;
      to?: string;
      userEmail?: string;
    },
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<AuditLogResponse>> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member) {
      throw new NotFoundError("Project not found");
    }

    if (member.role !== "OWNER" && member.role !== "EDITOR") {
      throw new ForbiddenError("Only owners and editors can view audit logs");
    }

    const createdAtFilter = {
      ...(filters.from && { gte: new Date(filters.from) }),
      ...(filters.to && { lte: new Date(filters.to) }),
    };

    const where = {
      projectId,
      ...(filters.action && { action: filters.action }),
      ...(filters.resourceType && { resourceType: filters.resourceType }),
      ...(Object.keys(createdAtFilter).length > 0 && { createdAt: createdAtFilter }),
      ...(filters.userEmail && {
        user: { email: { contains: filters.userEmail, mode: "insensitive" as const } },
      }),
    };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { email: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const items: AuditLogResponse[] = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      projectId: log.projectId,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      ipAddress: log.ipAddress,
      metadata: log.metadata as Record<string, unknown> | null,
      createdAt: log.createdAt,
      userEmail: log.user?.email ?? null,
    }));

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
