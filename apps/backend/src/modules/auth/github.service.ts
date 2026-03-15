import { randomUUID } from "crypto";
import { singleton } from "tsyringe";
import { BadRequestError, ConflictError, UnauthorizedError } from "@/common/errors";
import { logger } from "@/common/logger/logger";
import { PrismaClient } from "@/generated/prisma";
import { InvitationService } from "@/modules/invitation/invitation.service";
import type { AuthResponse, GitHubCallbackQuery, LinkGitHubBody } from "./auth.schema";
import { TokenService } from "./token.service";

@singleton()
export class GitHubService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tokenService: TokenService,
    private readonly invitationService: InvitationService,
  ) {}

  getAuthUrl(): string {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestError("GitHub OAuth is not configured");
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri:
        process.env.GITHUB_CALLBACK_URL ?? "http://localhost:4000/api/auth/github/callback",
      scope: "read:user user:email repo",
      state: randomUUID(),
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async callback(query: GitHubCallbackQuery): Promise<AuthResponse> {
    const { accessToken: ghAccessToken, profile } = await this.exchangeCode(query.code);

    const existingByGithubId = await this.prisma.user.findUnique({
      where: { githubId: profile.id.toString() },
    });

    if (existingByGithubId) {
      return this.loginUser(existingByGithubId, ghAccessToken, profile.login);
    }

    const rawEmail = profile.email ?? (await this.fetchPrimaryEmail(ghAccessToken));

    if (!rawEmail) {
      throw new BadRequestError(
        "No email associated with your GitHub account. Please add a public email to GitHub or register with email first.",
      );
    }
    const email = rawEmail.toLowerCase();

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingByEmail) {
      if (existingByEmail.deletedAt) {
        throw new UnauthorizedError("This account has been deactivated");
      }

      const { firstName, lastName } = this.parseName(profile.name, profile.login);
      const updated = await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          githubId: profile.id.toString(),
          githubUsername: profile.login,
          githubAccessToken: ghAccessToken,
          avatarUrl: existingByEmail.avatarUrl ?? profile.avatar_url,
          firstName: existingByEmail.firstName ?? firstName,
          lastName: existingByEmail.lastName ?? lastName,
          emailVerified: true,
        },
      });

      await this.upsertAccount(updated.id, profile.id.toString());
      return this.loginUser(updated, ghAccessToken, profile.login);
    }

    return this.createUser(profile, email, ghAccessToken);
  }

  async linkAccount(body: LinkGitHubBody, userId: string): Promise<{ message: string }> {
    const { accessToken: ghAccessToken, profile } = await this.exchangeCode(body.code);

    const existingGitHubUser = await this.prisma.user.findUnique({
      where: { githubId: profile.id.toString() },
    });

    if (existingGitHubUser) {
      throw new ConflictError("This GitHub account is already linked to another user");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        githubId: profile.id.toString(),
        githubUsername: profile.login,
        githubAccessToken: ghAccessToken,
      },
    });

    await this.upsertAccount(userId, profile.id.toString());
    return { message: "GitHub account linked successfully" };
  }

  private async exchangeCode(
    code: string,
  ): Promise<{ accessToken: string; profile: GitHubProfile }> {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
      }),
    });

    const tokenData = (await tokenResponse.json()) as GitHubTokenResponse;
    if (tokenData.error || !tokenData.access_token) {
      logger.warn({ error: tokenData.error }, "GitHub OAuth token exchange failed");
      throw new BadRequestError(
        tokenData.error_description ?? "Failed to exchange GitHub authorization code",
      );
    }

    const profileResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
      },
    });

    if (!profileResponse.ok) {
      throw new BadRequestError("Failed to fetch GitHub profile");
    }

    const profile = (await profileResponse.json()) as GitHubProfile;
    return { accessToken: tokenData.access_token, profile };
  }

  private async fetchPrimaryEmail(accessToken: string): Promise<string | null> {
    const response = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) return null;

    const emails = (await response.json()) as GitHubEmail[];
    const primary = emails.find((e) => e.primary && e.verified);
    return primary?.email ?? null;
  }

  private async loginUser(
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      emailVerified: boolean;
      avatarUrl: string | null;
    },
    ghAccessToken: string,
    ghUsername?: string,
  ): Promise<AuthResponse> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        githubAccessToken: ghAccessToken,
        ...(ghUsername && { githubUsername: ghUsername }),
      },
    });

    return this.tokenService.issueTokens(user, "GITHUB", user.id);
  }

  private parseName(name: string | null, login: string): { firstName: string; lastName: string } {
    if (!name) return { firstName: login, lastName: "" };
    const parts = name.trim().split(/\s+/);
    return {
      firstName: parts[0] ?? login,
      lastName: parts.length > 1 ? parts.slice(1).join(" ") : "",
    };
  }

  private async createUser(
    profile: GitHubProfile,
    email: string,
    ghAccessToken: string,
  ): Promise<AuthResponse> {
    const { firstName, lastName } = this.parseName(profile.name, profile.login);

    const tokenFamily = randomUUID();
    const user = await this.prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        avatarUrl: profile.avatar_url,
        githubId: profile.id.toString(),
        githubUsername: profile.login,
        githubAccessToken: ghAccessToken,
        emailVerified: true,
        accounts: {
          create: {
            provider: "GITHUB",
            providerAccountId: profile.id.toString(),
            tokenFamily,
          },
        },
      },
    });

    void this.invitationService.linkPendingInvitations(email, user.id);

    return this.tokenService.issueTokens(user, "GITHUB", profile.id.toString());
  }

  private async upsertAccount(userId: string, githubId: string): Promise<void> {
    await this.prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "GITHUB",
          providerAccountId: githubId,
        },
      },
      create: {
        userId,
        provider: "GITHUB",
        providerAccountId: githubId,
        tokenFamily: randomUUID(),
      },
      update: { userId },
    });
  }
}

interface GitHubTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface GitHubProfile {
  id: number;
  login: string;
  email: string | null;
  avatar_url: string;
  name: string | null;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}
