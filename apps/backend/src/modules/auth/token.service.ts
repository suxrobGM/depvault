import { randomUUID } from "crypto";
import { singleton } from "tsyringe";
import { signAccessToken, signRefreshToken } from "@/common/utils/jwt";
import { hashPassword } from "@/common/utils/password";
import { PrismaClient, type AuthProvider } from "@/generated/prisma";
import type { AuthResponse } from "./auth.schema";

interface TokenUser {
  id: string;
  email: string;
  username: string;
  role: string;
  emailVerified: boolean;
}

@singleton()
export class TokenService {
  constructor(private readonly prisma: PrismaClient) {}

  async issueTokens(
    user: TokenUser,
    provider: AuthProvider,
    accountId: string,
  ): Promise<AuthResponse> {
    const tokenFamily = randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ sub: user.id, email: user.email, role: user.role }),
      signRefreshToken(user.id),
    ]);

    const hashedRefreshToken = await hashPassword(refreshToken);
    await this.prisma.account.updateMany({
      where: { userId: user.id, provider, providerAccountId: accountId },
      data: { refreshToken: hashedRefreshToken, tokenFamily },
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
}
