import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import {
  AuthResponseSchema,
  ForgotPasswordBodySchema,
  LoginBodySchema,
  MessageResponseSchema,
  RefreshBodySchema,
  RegisterBodySchema,
  ResetPasswordBodySchema,
  VerifyEmailBodySchema,
} from "./auth.schema";
import { AuthService } from "./auth.service";

const authService = container.resolve(AuthService);

export const authController = new Elysia({ prefix: "/auth", detail: { tags: ["Auth"] } })
  .post("/register", ({ body }) => authService.register(body), {
    body: RegisterBodySchema,
    response: AuthResponseSchema,
    detail: { summary: "Register with email and password" },
  })
  .post("/login", ({ body }) => authService.login(body), {
    body: LoginBodySchema,
    response: AuthResponseSchema,
    detail: { summary: "Login with email and password" },
  })
  .post("/refresh", ({ body }) => authService.refresh(body), {
    body: RefreshBodySchema,
    response: AuthResponseSchema,
    detail: { summary: "Refresh access token using refresh token" },
  })
  .post("/forgot-password", ({ body }) => authService.forgotPassword(body), {
    body: ForgotPasswordBodySchema,
    response: MessageResponseSchema,
    detail: { summary: "Request password reset email" },
  })
  .post("/reset-password", ({ body }) => authService.resetPassword(body), {
    body: ResetPasswordBodySchema,
    response: MessageResponseSchema,
    detail: { summary: "Reset password with token" },
  })
  .post("/verify-email", ({ body }) => authService.verifyEmail(body), {
    body: VerifyEmailBodySchema,
    response: MessageResponseSchema,
    detail: { summary: "Verify email with token" },
  });
