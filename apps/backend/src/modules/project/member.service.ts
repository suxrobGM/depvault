import { singleton } from "tsyringe";
import { RoleChangeTemplate } from "@/common/emails";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/common/errors";
import { EmailService } from "@/common/services/email.service";
import { PrismaClient } from "@/generated/prisma";
import { NotificationService } from "@/modules/notification/notification.service";
import type { PaginatedResponse } from "@/types/response";
import type { MemberResponse, TransferOwnershipBody, UpdateMemberRoleBody } from "./member.schema";

const MEMBER_INCLUDE = {
  user: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true } },
} as const;

@singleton()
export class MemberService {
  private readonly frontendUrl = process.env.FRONTEND_URL!;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  async list(
    projectId: string,
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<MemberResponse>> {
    await this.requireMember(projectId, userId);

    const where = { projectId };

    const [members, total] = await Promise.all([
      this.prisma.projectMember.findMany({
        where,
        include: MEMBER_INCLUDE,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.projectMember.count({ where }),
    ]);

    return {
      items: members.map(this.toResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateRole(
    projectId: string,
    memberId: string,
    body: UpdateMemberRoleBody,
    userId: string,
  ): Promise<MemberResponse> {
    await this.requireOwner(projectId, userId);

    const target = await this.prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
    });

    if (!target) {
      throw new NotFoundError("Member not found");
    }

    if (target.role === "OWNER") {
      throw new ForbiddenError("Cannot change the owner's role");
    }

    const [updated, targetUser, project] = await Promise.all([
      this.prisma.projectMember.update({
        where: { id: memberId },
        data: { role: body.role },
        include: MEMBER_INCLUDE,
      }),
      this.prisma.user.findUnique({
        where: { id: target.userId },
        select: { email: true, firstName: true },
      }),
      this.prisma.project.findUnique({ where: { id: projectId }, select: { name: true } }),
    ]);

    if (targetUser && project) {
      void this.emailService.send({
        to: targetUser.email,
        subject: `Your role changed in ${project.name} — DepVault`,
        react: RoleChangeTemplate({
          firstName: targetUser.firstName,
          projectName: project.name,
          oldRole: target.role,
          newRole: body.role,
          dashboardUrl: `${this.frontendUrl}/dashboard`,
        }),
      });
    }

    void this.notificationService.notify({
      type: "ROLE_CHANGE",
      userId: target.userId,
      projectId,
      oldRole: target.role,
      newRole: body.role,
    });

    return this.toResponse(updated);
  }

  async remove(projectId: string, memberId: string, userId: string): Promise<{ message: string }> {
    await this.requireOwner(projectId, userId);

    const target = await this.prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
      include: { user: { select: { id: true, email: true, firstName: true } } },
    });

    if (!target) {
      throw new NotFoundError("Member not found");
    }

    if (target.role === "OWNER") {
      throw new ForbiddenError("Cannot remove the project owner");
    }

    await this.prisma.projectMember.delete({
      where: { id: memberId },
    });

    void this.notificationService.notify({
      type: "MEMBER_REMOVED",
      userId: target.userId,
      projectId,
    });

    return { message: "Member removed successfully" };
  }

  async transferOwnership(
    projectId: string,
    body: TransferOwnershipBody,
    userId: string,
  ): Promise<{ message: string }> {
    const owner = await this.requireOwner(projectId, userId);

    if (body.newOwnerId === userId) {
      throw new BadRequestError("You are already the owner");
    }

    const newOwnerMember = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: body.newOwnerId } },
    });

    if (!newOwnerMember) {
      throw new NotFoundError("Target user is not a member of this project");
    }

    await this.prisma.$transaction([
      this.prisma.projectMember.update({
        where: { id: newOwnerMember.id },
        data: { role: "OWNER" },
      }),
      this.prisma.projectMember.update({
        where: { id: owner.id },
        data: { role: "EDITOR" },
      }),
      this.prisma.project.update({
        where: { id: projectId },
        data: { ownerId: body.newOwnerId },
      }),
    ]);

    return { message: "Ownership transferred successfully" };
  }

  private async requireMember(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member) {
      throw new NotFoundError("Project not found");
    }

    return member;
  }

  private async requireOwner(projectId: string, userId: string) {
    const member = await this.requireMember(projectId, userId);

    if (member.role !== "OWNER") {
      throw new ForbiddenError("Only the project owner can perform this action");
    }

    return member;
  }

  private toResponse(member: {
    id: string;
    projectId: string;
    userId: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    };
  }): MemberResponse {
    return {
      id: member.id,
      projectId: member.projectId,
      userId: member.userId,
      role: member.role as MemberResponse["role"],
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      user: member.user,
    };
  }
}
