import { t, type Static } from "elysia";

export const RegisterBodySchema = t.Object({
  email: t.String({ format: "email" }),
  username: t.String({ minLength: 3, maxLength: 30 }),
  password: t.String({ minLength: 8, maxLength: 128 }),
});

export const LoginBodySchema = t.Object({
  email: t.String({ format: "email" }),
  password: t.String(),
});

export const RefreshBodySchema = t.Object({
  refreshToken: t.String(),
});

export const ForgotPasswordBodySchema = t.Object({
  email: t.String({ format: "email" }),
});

export const ResetPasswordBodySchema = t.Object({
  token: t.String(),
  password: t.String({ minLength: 8, maxLength: 128 }),
});

export const VerifyEmailBodySchema = t.Object({
  token: t.String(),
});

export const AuthResponseSchema = t.Object({
  accessToken: t.String(),
  refreshToken: t.String(),
  user: t.Object({
    id: t.String(),
    email: t.String(),
    username: t.String(),
    role: t.String(),
    emailVerified: t.Boolean(),
  }),
});

export const MessageResponseSchema = t.Object({
  message: t.String(),
});

export const GitHubCallbackQuerySchema = t.Object({
  code: t.String(),
  state: t.Optional(t.String()),
});

export const LinkGitHubBodySchema = t.Object({
  code: t.String(),
});

export type RegisterBody = Static<typeof RegisterBodySchema>;
export type LoginBody = Static<typeof LoginBodySchema>;
export type RefreshBody = Static<typeof RefreshBodySchema>;
export type ForgotPasswordBody = Static<typeof ForgotPasswordBodySchema>;
export type ResetPasswordBody = Static<typeof ResetPasswordBodySchema>;
export type VerifyEmailBody = Static<typeof VerifyEmailBodySchema>;
export type AuthResponse = Static<typeof AuthResponseSchema>;
export type GitHubCallbackQuery = Static<typeof GitHubCallbackQuerySchema>;
export type LinkGitHubBody = Static<typeof LinkGitHubBodySchema>;
