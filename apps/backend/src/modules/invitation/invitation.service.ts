import { singleton } from "tsyringe";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/common/errors";
import { logger } from "@/common/logger";
import { PrismaClient } from "@/generated/prisma";
import { NotificationService } from "@/modules/notification/notification.service";
import { PlanEnforcementService } from "@/modules/subscription/plan-enforcement.service";
import type { PaginatedResponse } from "@/types/response";
import { InvitationEmailService } from "./invitation-email.service";
import { INVITATION_INCLUDE, toInvitationResponse } from "./invitation.mapper";
import type { CreateInvitationBody, InvitationResponse } from "./invitation.schema";

const INVITATION_EXPIRY_DAYS = 7;

@singleton()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly invitationEmail: InvitationEmailService,
    private readonly notificationService: NotificationService,
    private readonly planEnforcement: PlanEnforcementService,
  ) {}

  async create(
    projectId: string,
    body: CreateInvitationBody,
    actorId: string,
  ): Promise<InvitationResponse> {
    await this.planEnforcement.enforceForProject(projectId, "member");

    const email = body.email.toLowerCase();
    const inviter = await this.getInviterName(actorId);

    const inviterUser = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { email: true },
    });

    if (inviterUser && inviterUser.email.toLowerCase() === email) {
      throw new BadRequestError("Cannot invite yourself");
    }

    await this.ensureNotMember(projectId, email);
    await this.ensureNoPendingInvite(projectId, email);

    const invitee = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const invitation = await this.prisma.projectInvitation.create({
      data: {
        projectId,
        email,
        role: body.role,
        invitedById: actorId,
        userId: invitee?.id ?? null,
        expiresAt,
      },
      include: INVITATION_INCLUDE,
    });

    this.invitationEmail.send({
      email,
      inviterName: inviter,
      projectName: invitation.project.name,
      role: body.role,
      token: invitation.token,
      isExistingUser: !!invitee,
    });

    if (invitee) {
      void this.notificationService.notify({
        type: "INVITATION_RECEIVED",
        userId: invitee.id,
        projectId,
        inviterName: inviter,
        token: invitation.token,
      });
    }

    return toInvitationResponse(invitation);
  }

  async listByProject(
    projectId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<InvitationResponse>> {
    return this.listPending({ projectId }, page, limit);
  }

  async listForUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<InvitationResponse>> {
    return this.listPending({ userId }, page, limit);
  }

  /** Returns minimal invitation info for the register form (no auth required). */
  async getByToken(token: string): Promise<{ email: string; projectName: string }> {
    const invitation = await this.findByToken(token);
    return { email: invitation.email, projectName: invitation.project.name };
  }

  async resend(
    projectId: string,
    invitationId: string,
    actorId: string,
  ): Promise<{ message: string }> {
    const invitation = await this.findPendingInvitation(invitationId, projectId);
    const inviter = await this.getInviterName(actorId);

    this.invitationEmail.resend({
      email: invitation.email,
      inviterName: inviter,
      projectName: invitation.project.name,
      role: invitation.role,
      token: invitation.token,
      isExistingUser: !!invitation.userId,
    });

    return { message: "Invitation resent" };
  }

  async cancel(projectId: string, invitationId: string): Promise<{ message: string }> {
    const invitation = await this.prisma.projectInvitation.findFirst({
      where: { id: invitationId, projectId },
    });

    if (!invitation) {
      throw new NotFoundError("Invitation not found");
    }

    if (invitation.status !== "PENDING") {
      throw new BadRequestError("Only pending invitations can be cancelled");
    }

    await this.prisma.$transaction([
      this.prisma.projectInvitation.deleteMany({
        where: {
          projectId: invitation.projectId,
          email: invitation.email,
          status: "CANCELLED",
        },
      }),
      this.prisma.projectInvitation.update({
        where: { id: invitationId },
        data: { status: "CANCELLED" },
      }),
    ]);

    return { message: "Invitation cancelled" };
  }

  /** Accepts an invitation by token during registration (skips recipient check). */
  async acceptByToken(token: string, userId: string): Promise<void> {
    try {
      const invitation = await this.findByToken(token);
      await this.acceptInvitation(invitation, userId);
    } catch (error) {
      logger.error({ error, token }, "Failed to auto-accept invitation during registration");
    }
  }

  async accept(token: string, userId: string): Promise<{ message: string }> {
    const invitation = await this.findByToken(token);
    await this.verifyRecipient(invitation.email, userId);
    return this.acceptInvitation(invitation, userId);
  }

  private async acceptInvitation(
    invitation: Awaited<ReturnType<typeof this.findByToken>>,
    userId: string,
  ): Promise<{ message: string }> {
    const existingMember = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: invitation.projectId, userId } },
    });

    const deleteOldAccepted = this.prisma.projectInvitation.deleteMany({
      where: {
        projectId: invitation.projectId,
        email: invitation.email,
        status: "ACCEPTED",
      },
    });

    if (existingMember) {
      await this.prisma.$transaction([
        deleteOldAccepted,
        this.prisma.projectInvitation.update({
          where: { id: invitation.id },
          data: { status: "ACCEPTED" },
        }),
      ]);
      return { message: "You are already a member of this project" };
    }

    await this.prisma.$transaction([
      deleteOldAccepted,
      this.prisma.projectMember.create({
        data: { projectId: invitation.projectId, userId, role: invitation.role },
      }),
      this.prisma.projectInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", userId },
      }),
    ]);

    return { message: "Invitation accepted" };
  }

  async decline(token: string, userId: string): Promise<{ message: string }> {
    const invitation = await this.findByToken(token);
    await this.verifyRecipient(invitation.email, userId);

    await this.prisma.$transaction([
      this.prisma.projectInvitation.deleteMany({
        where: {
          projectId: invitation.projectId,
          email: invitation.email,
          status: "DECLINED",
        },
      }),
      this.prisma.projectInvitation.update({
        where: { id: invitation.id },
        data: { status: "DECLINED", userId },
      }),
    ]);

    return { message: "Invitation declined" };
  }

  /** Links pending invitations to a newly registered user and creates notifications. */
  async linkPendingInvitations(email: string, userId: string): Promise<void> {
    try {
      const pendingInvitations = await this.prisma.projectInvitation.findMany({
        where: {
          email: email.toLowerCase(),
          status: "PENDING",
          userId: null,
          expiresAt: { gt: new Date() },
        },
        include: INVITATION_INCLUDE,
      });

      if (pendingInvitations.length === 0) return;

      await this.prisma.projectInvitation.updateMany({
        where: { id: { in: pendingInvitations.map((i) => i.id) } },
        data: { userId },
      });

      for (const invitation of pendingInvitations) {
        const inviterName =
          `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`.trim();
        void this.notificationService.notify({
          type: "INVITATION_RECEIVED",
          userId,
          projectId: invitation.projectId,
          inviterName,
          token: invitation.token,
        });
      }
    } catch (error) {
      logger.error({ error, email }, "Failed to link pending invitations");
    }
  }

  private async listPending(
    filter: { projectId?: string; userId?: string },
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<InvitationResponse>> {
    const where = { ...filter, status: "PENDING" as const, expiresAt: { gt: new Date() } };

    const [invitations, total] = await Promise.all([
      this.prisma.projectInvitation.findMany({
        where,
        include: INVITATION_INCLUDE,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.projectInvitation.count({ where }),
    ]);

    return {
      items: invitations.map(toInvitationResponse),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private async findByToken(token: string) {
    const invitation = await this.prisma.projectInvitation.findUnique({
      where: { token },
      include: INVITATION_INCLUDE,
    });

    if (!invitation) throw new NotFoundError("Invitation not found");
    if (invitation.status !== "PENDING")
      throw new BadRequestError("This invitation is no longer pending");
    if (invitation.expiresAt <= new Date())
      throw new BadRequestError("This invitation has expired");

    return invitation;
  }

  private async findPendingInvitation(invitationId: string, projectId: string) {
    const invitation = await this.prisma.projectInvitation.findFirst({
      where: { id: invitationId, projectId },
      include: INVITATION_INCLUDE,
    });

    if (!invitation) throw new NotFoundError("Invitation not found");
    if (invitation.status !== "PENDING")
      throw new BadRequestError("Only pending invitations can be resent");
    if (invitation.expiresAt <= new Date())
      throw new BadRequestError("This invitation has expired");

    return invitation;
  }

  private async verifyRecipient(invitationEmail: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user || user.email.toLowerCase() !== invitationEmail.toLowerCase()) {
      throw new ForbiddenError("This invitation was sent to a different email address");
    }
  }

  private async getInviterName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    return user ? `${user.firstName} ${user.lastName}`.trim() : "A team member";
  }

  private async ensureNotMember(projectId: string, email: string) {
    const existing = await this.prisma.projectMember.findFirst({
      where: { projectId, user: { email } },
    });

    if (existing) throw new ConflictError("User is already a member of this project");
  }

  private async ensureNoPendingInvite(projectId: string, email: string) {
    const existing = await this.prisma.projectInvitation.findFirst({
      where: { projectId, email, status: "PENDING", expiresAt: { gt: new Date() } },
    });

    if (existing) throw new ConflictError("An invitation is already pending for this email");
  }
}
