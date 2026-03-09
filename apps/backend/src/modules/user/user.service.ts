import { randomUUID } from "crypto";
import { isValidPassword, PASSWORD_REQUIREMENTS } from "@shared/utils/validators";
import { singleton } from "tsyringe";
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from "@/common/errors";
import { logger } from "@/common/logger/logger";
import { hashPassword, verifyPassword } from "@/common/utils/password";
import { PrismaClient } from "@/generated/prisma";
import type {
  ChangeEmailBody,
  ChangePasswordBody,
  UpdateProfileBody,
  UserProfileResponse,
} from "./user.schema";

@singleton()
export class UserService {
  constructor(private readonly prisma: PrismaClient) {}

  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      githubId: user.githubId,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateProfile(userId: string, body: UpdateProfileBody): Promise<UserProfileResponse> {
    const user = await this.prisma.user.update({
      where: { id: userId, deletedAt: null },
      data: {
        ...(body.firstName !== undefined && { firstName: body.firstName }),
        ...(body.lastName !== undefined && { lastName: body.lastName }),
        ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
      },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      githubId: user.githubId,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async changePassword(userId: string, body: ChangePasswordBody): Promise<{ message: string }> {
    if (!isValidPassword(body.newPassword)) {
      throw new BadRequestError(PASSWORD_REQUIREMENTS);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (!user.passwordHash) {
      throw new BadRequestError("Cannot change password for OAuth-only accounts");
    }

    const isValid = await verifyPassword(body.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError("Current password is incorrect");
    }

    const newHash = await hashPassword(body.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { message: "Password changed successfully" };
  }

  async changeEmail(userId: string, body: ChangeEmailBody): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (!user.passwordHash) {
      throw new BadRequestError("Cannot change email for OAuth-only accounts");
    }

    const isValid = await verifyPassword(body.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError("Password is incorrect");
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        email: body.newEmail,
        id: { not: userId },
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictError("Email is already in use");
    }

    const emailVerificationToken = randomUUID();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: body.newEmail,
        emailVerified: false,
        emailVerificationToken,
      },
    });

    // TODO: Send verification email with emailVerificationToken
    logger.info({ userId }, "Email change verification email pending");

    return { message: "Email updated. Please verify your new email address" };
  }

  async deleteAccount(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    await this.prisma.account.updateMany({
      where: { userId },
      data: { refreshToken: null, tokenFamily: null },
    });

    return { message: "Account deleted successfully" };
  }
}
