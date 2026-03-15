import { singleton } from "tsyringe";
import {
  EnvDriftWarningTemplate,
  GitSecretAlertTemplate,
  MemberRemovedTemplate,
  SecretRotationReminderTemplate,
  VulnerabilityAlertTemplate,
} from "@/common/emails";
import { NotFoundError } from "@/common/errors";
import { logger } from "@/common/logger";
import { EmailService } from "@/common/services/email.service";
import { NotificationType, PrismaClient, type Prisma } from "@/generated/prisma";
import type { PaginatedResponse } from "@/types/response";
import type { NotificationResponse } from "./notification.schema";
import { createNotificationContent, type NotifyPayload } from "./notification.utils";

@singleton()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly emailService: EmailService,
  ) {}

  async notify(payload: NotifyPayload): Promise<void> {
    try {
      const [user, project] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: payload.userId },
          select: { firstName: true, email: true },
        }),
        this.prisma.project.findUnique({
          where: { id: payload.projectId },
          select: { name: true },
        }),
      ]);

      if (!user || !project) {
        logger.warn({ payload }, "Notification skipped — user or project not found");
        return;
      }

      const content = createNotificationContent(payload, project.name);

      await this.prisma.notification.create({
        data: {
          userId: payload.userId,
          type: payload.type,
          title: content.title,
          message: content.message,
          metadata: content.metadata as Prisma.InputJsonValue,
        },
      });

      this.sendEmail(payload, user.firstName, user.email, project.name);
    } catch (error) {
      logger.error({ error, payload }, "Failed to create notification");
    }
  }

  async list(
    userId: string,
    filters: { type?: NotificationType; read?: boolean },
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<NotificationResponse>> {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(filters.type && { type: filters.type }),
      ...(filters.read !== undefined && { read: filters.read }),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items: notifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read,
        metadata: n.metadata as Record<string, unknown> | null,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(userId: string, notificationId: string): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      metadata: notification.metadata as Record<string, unknown> | null,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  async markRead(userId: string, notificationId: string): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      type: updated.type,
      title: updated.title,
      message: updated.message,
      read: updated.read,
      metadata: updated.metadata as Record<string, unknown> | null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async markAllRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return { count: result.count };
  }

  async delete(userId: string, notificationId: string): Promise<{ message: string }> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    await this.prisma.notification.delete({ where: { id: notificationId } });

    return { message: "Notification deleted" };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });

    return { count };
  }

  private sendEmail(
    payload: NotifyPayload,
    firstName: string,
    email: string,
    projectName: string,
  ): void {
    const dashboardUrl = `${process.env.FRONTEND_URL!}/notifications`;

    switch (payload.type) {
      case "VULNERABILITY_FOUND":
        void this.emailService.send({
          to: email,
          subject: `Vulnerability Alert — ${projectName}`,
          react: VulnerabilityAlertTemplate({
            firstName,
            projectName,
            count: payload.count,
            dashboardUrl,
          }),
        });
        break;
      case "SECRET_ROTATION":
        void this.emailService.send({
          to: email,
          subject: `Secret Rotation Reminder — ${projectName}`,
          react: SecretRotationReminderTemplate({
            firstName,
            projectName,
            variableNames: payload.variableNames,
            dashboardUrl,
          }),
        });
        break;
      case "ENV_DRIFT":
        void this.emailService.send({
          to: email,
          subject: `Environment Drift Warning — ${projectName}`,
          react: EnvDriftWarningTemplate({
            firstName,
            projectName,
            missingVars: payload.missingVars,
            dashboardUrl,
          }),
        });
        break;
      case "GIT_SECRET_DETECTION":
        void this.emailService.send({
          to: email,
          subject: `Secret Detected in Repository — ${projectName}`,
          react: GitSecretAlertTemplate({
            firstName,
            projectName,
            fileName: payload.fileName,
            dashboardUrl,
          }),
        });
        break;
      case "TEAM_INVITE":
      case "ROLE_CHANGE":
      case "INVITATION_RECEIVED":
        break;
      case "MEMBER_REMOVED":
        void this.emailService.send({
          to: email,
          subject: `You've been removed from ${projectName} — DepVault`,
          react: MemberRemovedTemplate({
            firstName,
            projectName,
            dashboardUrl,
          }),
        });
        break;
    }
  }
}
