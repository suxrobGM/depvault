import { singleton } from "tsyringe";
import { ForbiddenError, NotFoundError } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma";
import { PlanEnforcementService } from "@/modules/subscription/plan-enforcement.service";
import type { PaginatedResponse } from "@/types/response";
import type {
  CreateProjectBody,
  ProjectResponse,
  ProjectStatsResponse,
  UpdateProjectBody,
} from "./project.schema";

@singleton()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly planEnforcement: PlanEnforcementService,
  ) {}

  async create(body: CreateProjectBody, userId: string): Promise<ProjectResponse> {
    await this.planEnforcement.enforceProjectLimit(userId);

    const project = await this.prisma.project.create({
      data: {
        name: body.name,
        description: body.description,
        repositoryUrl: body.repositoryUrl,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
    });

    return { ...project, currentUserRole: "OWNER" };
  }

  async list(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<ProjectResponse>> {
    const where = {
      members: { some: { userId } },
    };

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: { members: { where: { userId }, select: { role: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      items: projects.map(({ members, ...rest }) => ({
        ...rest,
        currentUserRole: members[0]!.role,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(projectId: string, userId: string): Promise<ProjectResponse> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        members: { some: { userId } },
      },
      include: { members: { where: { userId }, select: { role: true } } },
    });

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const { members, ...rest } = project;
    return { ...rest, currentUserRole: members[0]!.role };
  }

  async update(
    projectId: string,
    body: UpdateProjectBody,
    userId: string,
  ): Promise<ProjectResponse> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member) {
      throw new NotFoundError("Project not found");
    }

    if (member.role !== "OWNER" && member.role !== "EDITOR") {
      throw new ForbiddenError("Only owners and editors can update projects");
    }

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.repositoryUrl !== undefined && { repositoryUrl: body.repositoryUrl }),
      },
    });

    return { ...project, currentUserRole: member.role };
  }

  async delete(projectId: string, userId: string): Promise<{ message: string }> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member) {
      throw new NotFoundError("Project not found");
    }

    if (member.role !== "OWNER") {
      throw new ForbiddenError("Only the project owner can delete projects");
    }

    await this.prisma.project.delete({
      where: { id: projectId },
    });

    return { message: "Project deleted successfully" };
  }

  async getStats(userId: string): Promise<ProjectStatsResponse> {
    const memberFilter = { members: { some: { userId } } };

    const [projectCount, dependencyCount, vulnerabilityCount, envVariableCount] = await Promise.all(
      [
        this.prisma.project.count({ where: memberFilter }),
        this.prisma.dependency.count({
          where: { analysis: { project: memberFilter } },
        }),
        this.prisma.vulnerability.count({
          where: { dependency: { analysis: { project: memberFilter } } },
        }),
        this.prisma.envVariable.count({
          where: { vault: { project: memberFilter } },
        }),
      ],
    );

    return {
      projectCount,
      dependencyCount,
      vulnerabilityCount,
      envVariableCount,
    };
  }
}
