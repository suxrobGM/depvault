import { Value } from "@sinclair/typebox/value";
import { t, type Static } from "elysia";

const envSchema = t.Object({
  DATABASE_URL: t.String(),
  JWT_SECRET: t.String(),
  JWT_EXPIRY: t.Optional(t.String({ default: "15m" })),
  REFRESH_TOKEN_EXPIRY: t.Optional(t.String({ default: "7d" })),
  PORT: t.Optional(t.String({ default: "4000" })),
  NODE_ENV: t.Optional(
    t.Union([t.Literal("development"), t.Literal("production"), t.Literal("staging")]),
  ),
  CORS_ORIGINS: t.Optional(t.String({ default: "http://localhost:4001" })),
  LOG_LEVEL: t.Optional(t.String({ default: "info" })),
  UPLOAD_DIR: t.Optional(t.String({ default: "./uploads" })),
  ADMIN_EMAIL: t.Optional(t.String()),
  ADMIN_PASSWORD: t.Optional(t.String()),
  GITHUB_CLIENT_ID: t.Optional(t.String()),
  GITHUB_CLIENT_SECRET: t.Optional(t.String()),
  GITHUB_CALLBACK_URL: t.Optional(
    t.String({ default: "http://localhost:4000/api/auth/github/callback" }),
  ),
  MASTER_ENCRYPTION_KEY: t.String({ minLength: 64, maxLength: 64 }),
  RESEND_API_KEY: t.Optional(t.String()),
  EMAIL_FROM_NAME: t.Optional(t.String({ default: "DepVault" })),
  EMAIL_FROM_ADDRESS: t.Optional(t.String({ default: "noreply@depvault.dev" })),
  FRONTEND_URL: t.Optional(t.String({ default: "http://localhost:4001" })),
});

export type Env = Static<typeof envSchema>;

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Env {}
  }
}

/**
 * Validates environment variables at startup.
 * Throws if required variables are missing.
 */
export function validateEnv(): void {
  const converted = Value.Convert(envSchema, { ...process.env });
  const errors = [...Value.Errors(envSchema, converted)];

  if (errors.length > 0) {
    const details = errors.map((e) => `  - ${e.path.replace("/", "")}: ${e.message}`).join("\n");
    throw new Error(`Environment validation failed:\n${details}`);
  }
}
