import { Elysia } from "elysia";
import { HttpError } from "@/common/errors";
import { logger } from "@/common/logger/logger";

const SENSITIVE_PATTERN =
  /(?:password|secret|token|key|encrypted|ciphertext|plaintext|authorization|apikey|private_key)\s*[=:]\s*\S+/gi;

const PRISMA_VALUE_PATTERN = /`[^`]*`\s*=\s*'[^']*'/g;

const isProduction = process.env.NODE_ENV === "production";

function sanitizeErrorMessage(message: string): string {
  return message
    .replace(SENSITIVE_PATTERN, "[REDACTED]")
    .replace(PRISMA_VALUE_PATTERN, "[REDACTED]");
}

function isPrismaError(error: Error): boolean {
  return error.constructor?.name?.startsWith("Prisma") || error.message?.includes("prisma");
}

/**
 * Global error handling plugin.
 * Catches unhandled errors and returns consistent JSON error responses.
 * Sanitizes error messages to prevent leaking sensitive values.
 * In production, stack traces are never returned to clients.
 */
export const errorMiddleware = new Elysia({ name: "error-handler" }).onError(
  ({ code, error, set }) => {
    if (error instanceof HttpError) {
      set.status = error.statusCode;
      const safeMessage = sanitizeErrorMessage(error.message);
      logger.warn({ statusCode: error.statusCode, message: safeMessage }, "HTTP error");
      return { code: error.statusCode, message: safeMessage };
    }

    switch (code) {
      case "VALIDATION":
        set.status = 400;
        return {
          code: 400,
          message: "Validation error",
          details: isProduction ? undefined : sanitizeErrorMessage(error.message),
        };
      case "NOT_FOUND":
        set.status = 404;
        return { code: 404, message: "Not found" };
      default: {
        const safeMessage = isPrismaError(error as Error)
          ? "Internal server error"
          : sanitizeErrorMessage((error as Error).message ?? "");

        logger.error(
          {
            code,
            message: safeMessage,
            ...(isProduction ? {} : { stack: (error as Error).stack }),
          },
          "Unhandled error",
        );

        set.status = 500;
        return { code: 500, message: "Internal server error" };
      }
    }
  },
);
