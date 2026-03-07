import { singleton } from "tsyringe";
import { ForbiddenError, NotFoundError } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma";
import type { PaginatedResponse } from "@/types/response";
import type { CreateProjectBody, ProjectResponse, UpdateProjectBody } from "./project.schema";

@singleton()
export class ProjectService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(body: CreateProjectBody, userId: string): Promise<ProjectResponse> {
    const project = await this.prisma.project.create({
      data: {
        name: body.name,
        description: body.description,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
    });

    return project;
  }

  async list(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<ProjectResponse>> {
    const where = {
      members: { some: { userId } },
    };

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.project.count({ where }),
    ]);

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

  async getById(projectId: string, userId: string): Promise<ProjectResponse> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        members: { some: { userId } },
      },
    });

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    return project;
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
      },
    });

    return project;
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
}
