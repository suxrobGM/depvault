import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware/auth.middleware";
import { rateLimiter } from "@/common/middleware/rate-limiter";
import {
  AuthResponseSchema,
  ForgotPasswordBodySchema,
  GitHubCallbackQuerySchema,
  LinkGitHubBodySchema,
  LoginBodySchema,
  MessageResponseSchema,
  RefreshBodySchema,
  RegisterBodySchema,
  ResetPasswordBodySchema,
  VerifyEmailBodySchema,
} from "./auth.schema";
import { AuthService } from "./auth.service";
import { clearAuthCookies, setAuthCookies } from "./auth.utils";
import { GitHubService } from "./github.service";

const authService = container.resolve(AuthService);
const githubService = container.resolve(GitHubService);

export const authController = new Elysia({ prefix: "/auth", detail: { tags: ["Auth"] } })
  .use(
    new Elysia().use(rateLimiter({ max: 5, windowMs: 60 * 60 * 1000 })).post(
      "/register",
      async ({ body, cookie }) => {
        const result = await authService.register(body);
        setAuthCookies(cookie, result);
        return result;
      },
      {
        body: RegisterBodySchema,
        response: AuthResponseSchema,
        detail: {
          summary: "Register with email and password",
          description:
            "Create a new account with email, username, and password. Returns JWT tokens. A verification email is sent to confirm the address.",
        },
      },
    ),
  )
  .use(
    new Elysia().use(rateLimiter({ max: 5, windowMs: 60 * 1000 })).post(
      "/login",
      async ({ body, cookie }) => {
        const result = await authService.login(body);
        setAuthCookies(cookie, result);
        return result;
      },
      {
        body: LoginBodySchema,
        response: AuthResponseSchema,
        detail: {
          summary: "Login with email and password",
          description:
            "Authenticate with email and password. Returns JWT access and refresh tokens. Email must be verified before login is allowed.",
        },
      },
    ),
  )
  .post(
    "/refresh",
    async ({ body, cookie }) => {
      const result = await authService.refresh(body);
      setAuthCookies(cookie, result);
      return result;
    },
    {
      body: RefreshBodySchema,
      response: AuthResponseSchema,
      detail: {
        summary: "Refresh access token",
        description:
          "Exchange a valid refresh token for a new access/refresh token pair. The old refresh token is invalidated (rotation).",
      },
    },
  )
  .post(
    "/logout",
    ({ cookie }) => {
      clearAuthCookies(cookie);
      return { message: "Logged out successfully" };
    },
    {
      response: MessageResponseSchema,
      detail: {
        summary: "Logout and clear auth cookies",
        description: "Clears httpOnly auth cookies from the browser.",
      },
    },
  )
  .use(
    new Elysia()
      .use(rateLimiter({ max: 3, windowMs: 60 * 60 * 1000 }))
      .post("/forgot-password", ({ body }) => authService.forgotPassword(body), {
        body: ForgotPasswordBodySchema,
        response: MessageResponseSchema,
        detail: {
          summary: "Request password reset email",
          description:
            "Send a password reset link to the provided email. Always returns success to prevent email enumeration.",
        },
      }),
  )
  .post("/reset-password", ({ body }) => authService.resetPassword(body), {
    body: ResetPasswordBodySchema,
    response: MessageResponseSchema,
    detail: {
      summary: "Reset password with token",
      description:
        "Set a new password using the reset token from the email link. Revokes all existing refresh tokens for security.",
    },
  })
  .post("/verify-email", ({ body }) => authService.verifyEmail(body), {
    body: VerifyEmailBodySchema,
    response: MessageResponseSchema,
    detail: {
      summary: "Verify email address",
      description:
        "Confirm email ownership using the verification token sent during registration or email change.",
    },
  })
  .get(
    "/github",
    ({ set }) => {
      const url = githubService.getAuthUrl();
      set.status = 302;
      set.headers.location = url;
    },
    {
      detail: {
        summary: "Initiate GitHub OAuth",
        description:
          "Redirect the user to GitHub's OAuth authorization page to begin the login flow.",
      },
    },
  )
  .get(
    "/github/callback",
    async ({ query, cookie, set }) => {
      const frontendUrl = process.env.CORS_ORIGINS?.split(",")[0] ?? "http://localhost:4001";
      try {
        const result = await githubService.callback(query);
        setAuthCookies(cookie, result);
        set.status = 302;
        set.headers.location = `${frontendUrl}/dashboard`;
      } catch (error) {
        const message = error instanceof Error ? error.message : "GitHub authentication failed";
        set.status = 302;
        set.headers.location = `${frontendUrl}/login?error=${encodeURIComponent(message)}`;
      }
    },
    {
      query: GitHubCallbackQuerySchema,
      detail: {
        summary: "GitHub OAuth callback",
        description:
          "Handle the OAuth callback from GitHub. Sets auth cookies and redirects to the frontend.",
      },
    },
  )
  .use(authGuard)
  .post("/link-github", ({ body, user }) => githubService.linkAccount(body, user.id), {
    body: LinkGitHubBodySchema,
    response: MessageResponseSchema,
    detail: {
      summary: "Link GitHub account",
      description: "Link a GitHub account to the current authenticated user for OAuth login.",
      security: [{ bearerAuth: [] }],
    },
  });
