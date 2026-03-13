import { singleton } from "tsyringe";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/common/errors";
import {
  DetectionSeverity,
  DetectionStatus,
  PrismaClient,
  ProjectRole,
  ScanStatus,
  type Prisma,
} from "@/generated/prisma";
import { GitHubApiService } from "@/modules/github/github-api.service";
import { NotificationService } from "@/modules/notification/notification.service";
import type { PaginatedResponse } from "@/types/response";
import { parseGitHubUrl } from "./parse-github-url";
import { executeScan } from "./secret-scan.executor";
import { toDetectionResponse, toScanResponse } from "./secret-scan.mapper";
import type {
  BatchUpdateDetectionsBody,
  BatchUpdateDetectionsResponse,
  DetectionListQuery,
  DetectionResponse,
  ScanResponse,
  ScanSummaryResponse,
  UpdateDetectionBody,
} from "./secret-scan.schema";

@singleton()
export class SecretScanService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly githubApi: GitHubApiService,
    private readonly notificationService: NotificationService,
  ) {}

  async triggerScan(projectId: string, userId: string): Promise<ScanResponse> {
    await this.requireEditor(projectId, userId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { repositoryUrl: true },
    });

    if (!project?.repositoryUrl) {
      throw new BadRequestError("Project has no connected GitHub repository");
    }

    const parsed = parseGitHubUrl(project.repositoryUrl);
    if (!parsed) {
      throw new BadRequestError("Invalid GitHub repository URL");
    }

    const scan = await this.prisma.secretScan.create({
      data: {
        projectId,
        triggeredById: userId,
        status: ScanStatus.PENDING,
      },
    });

    void executeScan(
      this.prisma,
      this.githubApi,
      this.notificationService,
      scan.id,
      projectId,
      userId,
      parsed.owner,
      parsed.repo,
    );

    return toScanResponse(scan);
  }

  async listScans(
    projectId: string,
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<ScanResponse>> {
    await this.requireMember(projectId, userId);

    const where = { projectId };
    const [rows, total] = await Promise.all([
      this.prisma.secretScan.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.secretScan.count({ where }),
    ]);

    return {
      items: rows.map(toScanResponse),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getScan(projectId: string, scanId: string, userId: string): Promise<ScanResponse> {
    await this.requireMember(projectId, userId);

    const scan = await this.prisma.secretScan.findFirst({
      where: { id: scanId, projectId },
    });

    if (!scan) throw new NotFoundError("Scan not found");

    return toScanResponse(scan);
  }

  async listDetections(
    projectId: string,
    userId: string,
    filters: DetectionListQuery,
  ): Promise<PaginatedResponse<DetectionResponse>> {
    await this.requireMember(projectId, userId);

    const { page, limit, status, severity } = filters;

    const where: Prisma.SecretDetectionWhereInput = {
      projectId,
      ...(status && { status }),
      ...(severity && { scanPattern: { severity } }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.secretDetection.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { scanPattern: { select: { name: true, severity: true } } },
      }),
      this.prisma.secretDetection.count({ where }),
    ]);

    return {
      items: rows.map(toDetectionResponse),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateDetectionStatus(
    projectId: string,
    detectionId: string,
    body: UpdateDetectionBody,
    userId: string,
  ): Promise<DetectionResponse> {
    await this.requireEditor(projectId, userId);

    const detection = await this.prisma.secretDetection.findFirst({
      where: { id: detectionId, projectId },
    });

    if (!detection) {
      throw new NotFoundError("Detection not found");
    }

    const updated = await this.prisma.secretDetection.update({
      where: { id: detectionId },
      data: {
        status: body.status,
        resolvedById: userId,
        resolvedAt: new Date(),
      },
      include: { scanPattern: { select: { name: true, severity: true } } },
    });

    return toDetectionResponse(updated);
  }

  async batchUpdateDetections(
    projectId: string,
    body: BatchUpdateDetectionsBody,
    userId: string,
  ): Promise<BatchUpdateDetectionsResponse> {
    await this.requireEditor(projectId, userId);

    const { count } = await this.prisma.secretDetection.updateMany({
      where: {
        id: { in: body.detectionIds },
        projectId,
        status: DetectionStatus.OPEN,
      },
      data: {
        status: body.status,
        resolvedById: userId,
        resolvedAt: new Date(),
      },
    });

    return { updatedCount: count };
  }

  async getScanSummary(projectId: string, userId: string): Promise<ScanSummaryResponse> {
    await this.requireMember(projectId, userId);

    const [lastScan, openCounts, totalResolved] = await Promise.all([
      this.prisma.secretScan.findFirst({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.secretDetection.groupBy({
        by: ["scanPatternId"],
        where: { projectId, status: DetectionStatus.OPEN },
        _count: true,
      }),
      this.prisma.secretDetection.count({
        where: {
          projectId,
          status: { in: [DetectionStatus.RESOLVED, DetectionStatus.FALSE_POSITIVE] },
        },
      }),
    ]);

    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };

    if (openCounts.length > 0) {
      const patternIds = openCounts.map((c) => c.scanPatternId);
      const patterns = await this.prisma.scanPattern.findMany({
        where: { id: { in: patternIds } },
        select: { id: true, severity: true },
      });
      const severityMap = new Map(patterns.map((p) => [p.id, p.severity]));

      for (const group of openCounts) {
        const severity = severityMap.get(group.scanPatternId);
        if (severity === DetectionSeverity.CRITICAL) severityCounts.critical += group._count;
        else if (severity === DetectionSeverity.HIGH) severityCounts.high += group._count;
        else if (severity === DetectionSeverity.MEDIUM) severityCounts.medium += group._count;
        else if (severity === DetectionSeverity.LOW) severityCounts.low += group._count;
      }
    }

    return {
      lastScan: lastScan ? toScanResponse(lastScan) : null,
      openDetections: severityCounts,
      totalResolved,
    };
  }

  private async requireMember(projectId: string, userId: string): Promise<void> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new NotFoundError("Project not found");
  }

  private async requireEditor(projectId: string, userId: string): Promise<void> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new NotFoundError("Project not found");
    if (member.role === ProjectRole.VIEWER) {
      throw new ForbiddenError("Viewers cannot perform this action");
    }
  }
}
