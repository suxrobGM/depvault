import { t, type Static } from "elysia";

const EnvSchema = t.Object({
  DATABASE_URL: t.String(),
  JWT_SECRET: t.String(),
  JWT_EXPIRY: t.Optional(t.String({ default: "15m" })),
  REFRESH_TOKEN_EXPIRY: t.Optional(t.String({ default: "30d" })),
  PORT: t.Optional(t.String({ default: "3000" })),
  NODE_ENV: t.Optional(
    t.Union([t.Literal("development"), t.Literal("production"), t.Literal("staging")]),
  ),
  CORS_ORIGINS: t.Optional(t.String({ default: "http://localhost:4001" })),
  LOG_LEVEL: t.Optional(t.String({ default: "info" })),
  UPLOAD_DIR: t.Optional(t.String({ default: "./uploads" })),
  ADMIN_EMAIL: t.Optional(t.String()),
  ADMIN_PASSWORD: t.Optional(t.String()),
});

export type Env = Static<typeof EnvSchema>;

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Env {}
  }
}

/**
 * Validates environment variables at startup.
 * Throws if required variables are missing.
 */
export function validateEnv(): Env {
  const env = {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRY: process.env.JWT_EXPIRY ?? "15m",
    REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY ?? "30d",
    PORT: process.env.PORT ?? "4000",
    NODE_ENV: process.env.NODE_ENV ?? "development",
    CORS_ORIGINS: process.env.CORS_ORIGINS ?? "http://localhost:4001",
    LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
    UPLOAD_DIR: process.env.UPLOAD_DIR ?? "./uploads",
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  };

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  if (!env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }

  return env as Env;
}
