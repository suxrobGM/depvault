import { randomUUID } from "crypto";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { isValidPassword, PASSWORD_REQUIREMENTS } from "@shared/utils/validators";
import { singleton } from "tsyringe";
import { EmailChangeVerificationTemplate } from "@/common/emails";
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from "@/common/errors";
import { EmailService } from "@/common/services/email.service";
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
  private readonly frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:4001";

  constructor(
    private readonly prisma: PrismaClient,
    private readonly emailService: EmailService,
  ) {}

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
      githubUsername: user.githubUsername,
      hasPassword: !!user.passwordHash,
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
      githubUsername: user.githubUsername,
      hasPassword: !!user.passwordHash,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async uploadAvatar(userId: string, file: File): Promise<{ avatarUrl: string }> {
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new BadRequestError("Only jpg, png, gif, and webp images are allowed");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const uploadsDir = resolve(process.env.UPLOAD_DIR ?? "./uploads", "avatars");
    mkdirSync(uploadsDir, { recursive: true });

    if (user.avatarUrl) {
      const oldFilename = basename(user.avatarUrl);
      const oldPath = resolve(uploadsDir, oldFilename);
      if (existsSync(oldPath)) {
        unlinkSync(oldPath);
      }
    }

    const ext = extname(file.name) || this.mimeToExt(file.type);
    const filename = `${userId}-${Date.now()}${ext}`;
    const filePath = resolve(uploadsDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(filePath, buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    return { avatarUrl };
  }

  private mimeToExt(mime: string): string {
    const map: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
    };
    return map[mime] ?? ".bin";
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

    const newEmail = body.newEmail.toLowerCase();

    const existing = await this.prisma.user.findFirst({
      where: {
        email: newEmail,
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
        email: newEmail,
        emailVerified: false,
        emailVerificationToken,
      },
    });

    const verificationUrl = `${this.frontendUrl}/verify-email?token=${emailVerificationToken}`;

    void this.emailService.send({
      to: newEmail,
      subject: "Verify your new email — DepVault",
      react: EmailChangeVerificationTemplate({
        firstName: user.firstName,
        newEmail,
        verificationUrl,
      }),
    });

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
