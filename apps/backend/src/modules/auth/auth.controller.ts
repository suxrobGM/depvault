import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware/auth.middleware";
import { rateLimiter } from "@/common/middleware/rate-limiter";
import { TooManyRequestsErrorSchema } from "@/types/response";
import {
  AuthResponseSchema,
  DeviceCodeResponseSchema,
  DeviceTokenBodySchema,
  DeviceTokenResponseSchema,
  DeviceVerifyBodySchema,
  ForgotPasswordBodySchema,
  GitHubCallbackQuerySchema,
  LinkGitHubBodySchema,
  LoginBodySchema,
  MessageResponseSchema,
  RegisterBodySchema,
  ResetPasswordBodySchema,
  VerifyEmailBodySchema,
} from "./auth.schema";
import { AuthService } from "./auth.service";
import { clearAuthCookies, setAuthCookies } from "./auth.utils";
import { DeviceCodeService } from "./device-code.service";
import { GitHubService } from "./github.service";

const authService = container.resolve(AuthService);
const githubService = container.resolve(GitHubService);
const deviceCodeService = container.resolve(DeviceCodeService);

export const authController = new Elysia({ prefix: "/auth", detail: { tags: ["Auth"] } })
  // Register — 5 requests per hour
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
        response: { 200: AuthResponseSchema, ...TooManyRequestsErrorSchema },
        detail: {
          operationId: "registerUser",
          summary: "Register with email and password",
          description:
            "Create a new account with email, username, and password. Returns JWT tokens. A verification email is sent to confirm the address.",
        },
      },
    ),
  )

  // Login — 5 requests per minute
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
        response: { 200: AuthResponseSchema, ...TooManyRequestsErrorSchema },
        detail: {
          operationId: "loginUser",
          summary: "Login with email and password",
          description:
            "Authenticate with email and password. Returns JWT access and refresh tokens. Email must be verified before login is allowed.",
        },
      },
    ),
  )

  // Refresh & logout — no rate limit
  .post(
    "/refresh",
    async ({ cookie }) => {
      const refreshToken = String(cookie.refresh_token?.value ?? "");
      const result = await authService.refresh(refreshToken);
      setAuthCookies(cookie, result);
      return result;
    },
    {
      response: AuthResponseSchema,
      detail: {
        operationId: "refreshToken",
        summary: "Refresh access token",
        description:
          "Exchange the refresh_token cookie for a new access/refresh token pair. The old refresh token is invalidated (rotation).",
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
        operationId: "logoutUser",
        summary: "Logout and clear auth cookies",
        description: "Clears httpOnly auth cookies from the browser.",
      },
    },
  )

  // Password reset & email verification — 3 requests per hour
  .use(
    new Elysia()
      .use(rateLimiter({ max: 3, windowMs: 60 * 60 * 1000 }))
      .post("/forgot-password", ({ body }) => authService.forgotPassword(body), {
        body: ForgotPasswordBodySchema,
        response: { 200: MessageResponseSchema, ...TooManyRequestsErrorSchema },
        detail: {
          operationId: "forgotPassword",
          summary: "Request password reset email",
          description:
            "Send a password reset link to the provided email. Always returns success to prevent email enumeration.",
        },
      })
      .post("/reset-password", ({ body }) => authService.resetPassword(body), {
        body: ResetPasswordBodySchema,
        response: { 200: MessageResponseSchema, ...TooManyRequestsErrorSchema },
        detail: {
          operationId: "resetPassword",
          summary: "Reset password with token",
          description:
            "Set a new password using the reset token from the email link. Revokes all existing refresh tokens for security.",
        },
      })
      .post("/verify-email", ({ body }) => authService.verifyEmail(body), {
        body: VerifyEmailBodySchema,
        response: { 200: MessageResponseSchema, ...TooManyRequestsErrorSchema },
        detail: {
          operationId: "verifyEmail",
          summary: "Verify email address",
          description:
            "Confirm email ownership using the verification token sent during registration or email change.",
        },
      }),
  )

  // GitHub OAuth — no rate limit
  .get(
    "/github",
    ({ set }) => {
      const url = githubService.getAuthUrl();
      set.status = 302;
      set.headers.location = url;
    },
    {
      detail: {
        operationId: "initiateGithubOAuth",
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
        operationId: "githubOAuthCallback",
        summary: "GitHub OAuth callback",
        description:
          "Handle the OAuth callback from GitHub. Sets auth cookies and redirects to the frontend.",
      },
    },
  )

  // Device code flow — CLI login
  .use(
    new Elysia()
      .use(rateLimiter({ max: 5, windowMs: 60 * 60 * 1000 }))
      .post("/device", () => deviceCodeService.createDeviceCode(), {
        response: { 200: DeviceCodeResponseSchema, ...TooManyRequestsErrorSchema },
        detail: {
          operationId: "createDeviceCode",
          summary: "Request a device verification code for CLI login",
          description:
            "Generate a device code pair for the CLI device authorization flow. The CLI displays the user code and polls for completion.",
        },
      }),
  )
  .use(
    new Elysia()
      .use(rateLimiter({ max: 12, windowMs: 60 * 1000 }))
      .post("/device/token", ({ body }) => deviceCodeService.pollDeviceCode(body.deviceCode), {
        body: DeviceTokenBodySchema,
        response: { 200: DeviceTokenResponseSchema, ...TooManyRequestsErrorSchema },
        detail: {
          operationId: "pollDeviceToken",
          summary: "Poll for device code authorization status",
          description:
            "Check whether the user has verified the device code. Returns tokens once verified, or pending/expired status.",
        },
      }),
  )

  // Authenticated routes
  .use(authGuard)
  .post(
    "/device/verify",
    ({ body, user }) => deviceCodeService.verifyDeviceCode(body.userCode, user.id),
    {
      body: DeviceVerifyBodySchema,
      response: MessageResponseSchema,
      detail: {
        operationId: "verifyDeviceCode",
        summary: "Verify a device code",
        description: "Authorize a CLI device by confirming the user code. Requires authentication.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post("/link-github", ({ body, user }) => githubService.linkAccount(body, user.id), {
    body: LinkGitHubBodySchema,
    response: MessageResponseSchema,
    detail: {
      operationId: "linkGithubAccount",
      summary: "Link GitHub account",
      description: "Link a GitHub account to the current authenticated user for OAuth login.",
      security: [{ bearerAuth: [] }],
    },
  });
