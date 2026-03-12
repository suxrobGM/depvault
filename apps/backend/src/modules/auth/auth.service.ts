import { randomUUID } from "crypto";
import { isValidPassword, PASSWORD_REQUIREMENTS } from "@shared/utils/validators";
import { singleton } from "tsyringe";
import { PasswordResetTemplate, VerifyEmailTemplate } from "@/common/emails";
import { BadRequestError, ConflictError, UnauthorizedError } from "@/common/errors";
import { logger } from "@/common/logger/logger";
import { EmailService } from "@/common/services/email.service";
import { verifyRefreshToken } from "@/common/utils/jwt";
import { hashPassword, verifyPassword } from "@/common/utils/password";
import { PrismaClient } from "@/generated/prisma";
import type {
  AuthResponse,
  ForgotPasswordBody,
  LoginBody,
  RegisterBody,
  ResetPasswordBody,
  VerifyEmailBody,
} from "./auth.schema";
import { TokenService } from "./token.service";

const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

@singleton()
export class AuthService {
  private readonly frontendUrl = process.env.FRONTEND_URL!;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly tokenService: TokenService,
    private readonly emailService: EmailService,
  ) {}

  async register(body: RegisterBody): Promise<AuthResponse> {
    if (!isValidPassword(body.password)) {
      throw new BadRequestError(PASSWORD_REQUIREMENTS);
    }

    const email = body.email.toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }

    const passwordHash = await hashPassword(body.password);
    const emailVerificationToken = randomUUID();
    const tokenFamily = randomUUID();

    const user = await this.prisma.user.create({
      data: {
        email,
        firstName: body.firstName,
        lastName: body.lastName,
        passwordHash,
        emailVerificationToken,
        accounts: {
          create: {
            provider: "EMAIL",
            providerAccountId: email,
            tokenFamily,
          },
        },
      },
    });

    const verificationUrl = `${this.frontendUrl}/verify-email?token=${emailVerificationToken}`;

    void this.emailService.send({
      to: user.email,
      subject: "Verify your email — DepVault",
      react: VerifyEmailTemplate({ firstName: body.firstName, verificationUrl }),
    });

    return this.tokenService.issueTokens(user, "EMAIL", email);
  }

  async login(body: LoginBody): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
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

    return this.tokenService.issueTokens(user, "EMAIL", user.email);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    let sub: string;
    try {
      ({ sub } = await verifyRefreshToken(refreshToken));
    } catch {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: sub },
      include: { accounts: true },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedError("User not found");
    }

    const matchedAccount = await this.findMatchingAccount(user.accounts, refreshToken);
    if (!matchedAccount) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    return this.tokenService.issueTokens(
      user,
      matchedAccount.provider,
      matchedAccount.providerAccountId,
    );
  }

  async forgotPassword(body: ForgotPasswordBody): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
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

    const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;

    this.emailService.send({
      to: body.email,
      subject: "Reset your password — DepVault",
      react: PasswordResetTemplate({ firstName: user.firstName, resetUrl }),
    });

    return { message: "If an account with that email exists, a reset link has been sent" };
  }

  async resetPassword(body: ResetPasswordBody): Promise<{ message: string }> {
    if (!isValidPassword(body.password)) {
      throw new BadRequestError(PASSWORD_REQUIREMENTS);
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

  private async findMatchingAccount(
    accounts: {
      id: string;
      userId: string;
      provider: "EMAIL" | "GITHUB";
      providerAccountId: string;
      refreshToken: string | null;
    }[],
    rawRefreshToken: string,
  ) {
    for (const account of accounts) {
      if (!account.refreshToken) continue;
      const isValid = await verifyPassword(rawRefreshToken, account.refreshToken);
      if (isValid) return account;
    }

    // Possible replay attack — revoke all tokens
    const first = accounts[0];
    if (first) {
      await this.prisma.account.updateMany({
        where: { userId: first.userId },
        data: { refreshToken: null, tokenFamily: null },
      });
      logger.warn({ userId: first.userId }, "Refresh token replay detected, revoked all tokens");
    }

    return null;
  }
}
