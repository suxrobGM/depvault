import { randomUUID } from "crypto";
import { singleton } from "tsyringe";
import { BadRequestError, ConflictError, UnauthorizedError } from "@/common/errors";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/common/utils/jwt";
import { logger } from "@/common/utils/logger";
import { hashPassword, verifyPassword } from "@/common/utils/password";
import { PrismaClient } from "@/generated/prisma";
import type {
  AuthResponse,
  ForgotPasswordBody,
  LoginBody,
  RefreshBody,
  RegisterBody,
  ResetPasswordBody,
  VerifyEmailBody,
} from "./auth.schema";

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

@singleton()
export class AuthService {
  constructor(private readonly prisma: PrismaClient) {}

  async register(body: RegisterBody): Promise<AuthResponse> {
    if (!PASSWORD_REGEX.test(body.password)) {
      throw new BadRequestError(
        "Password must be at least 8 characters with one uppercase letter and one number",
      );
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: body.email }, { username: body.username }],
      },
    });

    if (existingUser) {
      const field = existingUser.email === body.email ? "email" : "username";
      throw new ConflictError(`User with this ${field} already exists`);
    }

    const passwordHash = await hashPassword(body.password);
    const emailVerificationToken = randomUUID();
    const tokenFamily = randomUUID();

    const user = await this.prisma.user.create({
      data: {
        email: body.email,
        username: body.username,
        passwordHash,
        emailVerificationToken,
        accounts: {
          create: {
            provider: "EMAIL",
            providerAccountId: body.email,
            tokenFamily,
          },
        },
      },
    });

    // TODO: Send verification email with emailVerificationToken
    logger.info({ userId: user.id }, "Verification email pending");

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ sub: user.id, email: user.email, role: user.role }),
      signRefreshToken(user.id),
    ]);

    const hashedRefreshToken = await hashPassword(refreshToken);
    await this.prisma.account.update({
      where: { provider_providerAccountId: { provider: "EMAIL", providerAccountId: user.email } },
      data: { refreshToken: hashedRefreshToken },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    };
  }

  async login(body: LoginBody): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: body.email },
      include: { accounts: { where: { provider: "EMAIL" } } },
    });

    if (!user || !user.passwordHash || user.deletedAt) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (!user.emailVerified) {
      throw new UnauthorizedError("Please verify your email before logging in");
    }

    const passwordValid = await verifyPassword(body.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const tokenFamily = randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ sub: user.id, email: user.email, role: user.role }),
      signRefreshToken(user.id),
    ]);

    const hashedRefreshToken = await hashPassword(refreshToken);
    const emailAccount = user.accounts[0];

    if (emailAccount) {
      await this.prisma.account.update({
        where: { id: emailAccount.id },
        data: { refreshToken: hashedRefreshToken, tokenFamily },
      });
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    };
  }

  async refresh(body: RefreshBody): Promise<AuthResponse> {
    let sub: string;
    try {
      ({ sub } = await verifyRefreshToken(body.refreshToken));
    } catch {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: sub },
      include: { accounts: { where: { provider: "EMAIL" } } },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedError("User not found");
    }

    const emailAccount = user.accounts[0];
    if (!emailAccount?.refreshToken) {
      throw new UnauthorizedError("No active session");
    }

    const isValid = await verifyPassword(body.refreshToken, emailAccount.refreshToken);
    if (!isValid) {
      // Possible replay attack — revoke the entire token family
      await this.prisma.account.update({
        where: { id: emailAccount.id },
        data: { refreshToken: null, tokenFamily: null },
      });
      logger.warn({ userId: user.id }, "Refresh token replay detected, revoked token family");
      throw new UnauthorizedError("Invalid refresh token");
    }

    const newTokenFamily = emailAccount.tokenFamily ?? randomUUID();
    const [accessToken, newRefreshToken] = await Promise.all([
      signAccessToken({ sub: user.id, email: user.email, role: user.role }),
      signRefreshToken(user.id),
    ]);

    const hashedRefreshToken = await hashPassword(newRefreshToken);
    await this.prisma.account.update({
      where: { id: emailAccount.id },
      data: { refreshToken: hashedRefreshToken, tokenFamily: newTokenFamily },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    };
  }

  async forgotPassword(body: ForgotPasswordBody): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: body.email },
    });

    // Always return success to prevent email enumeration
    if (!user || user.deletedAt) {
      return { message: "If an account with that email exists, a reset link has been sent" };
    }

    const resetToken = randomUUID();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS),
      },
    });

    // TODO: Send password reset email with resetToken
    logger.info({ userId: user.id }, "Password reset email pending");

    return { message: "If an account with that email exists, a reset link has been sent" };
  }

  async resetPassword(body: ResetPasswordBody): Promise<{ message: string }> {
    if (!PASSWORD_REGEX.test(body.password)) {
      throw new BadRequestError(
        "Password must be at least 8 characters with one uppercase letter and one number",
      );
    }

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: body.token,
        passwordResetExpiresAt: { gte: new Date() },
        deletedAt: null,
      },
    });

    if (!user) {
      throw new BadRequestError("Invalid or expired reset token");
    }

    const passwordHash = await hashPassword(body.password);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });

    // Revoke all refresh tokens for security
    await this.prisma.account.updateMany({
      where: { userId: user.id },
      data: { refreshToken: null, tokenFamily: null },
    });

    return { message: "Password has been reset successfully" };
  }

  async verifyEmail(body: VerifyEmailBody): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: body.token,
        emailVerified: false,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new BadRequestError("Invalid or expired verification token");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
      },
    });

    return { message: "Email verified successfully" };
  }
}
