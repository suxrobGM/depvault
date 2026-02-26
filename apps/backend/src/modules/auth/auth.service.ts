import { randomUUID } from "crypto";
import { injectable } from "tsyringe";
import { BadRequestError, ConflictError, UnauthorizedError } from "@/common/errors";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/common/utils/jwt";
import { hashPassword, verifyPassword } from "@/common/utils/password";
import { PrismaClient } from "@/generated/prisma";
import type { AuthResponse, RefreshBody, RegisterBody } from "./auth.schema";

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

@injectable()
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

    const user = await this.prisma.user.create({
      data: {
        email: body.email,
        username: body.username,
        passwordHash,
        accounts: {
          create: {
            provider: "EMAIL",
            providerAccountId: body.email,
          },
        },
      },
    });

    // TODO: Send verification email with emailVerificationToken
    void emailVerificationToken;

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
      throw new UnauthorizedError("Invalid refresh token");
    }

    const [accessToken, newRefreshToken] = await Promise.all([
      signAccessToken({ sub: user.id, email: user.email, role: user.role }),
      signRefreshToken(user.id),
    ]);

    const hashedRefreshToken = await hashPassword(newRefreshToken);
    await this.prisma.account.update({
      where: { id: emailAccount.id },
      data: { refreshToken: hashedRefreshToken },
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
}
