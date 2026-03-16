import { Elysia } from "elysia";
import { HttpError } from "@/common/errors";
import { logger } from "@/common/logger/logger";
import type { ErrorResponse } from "@/types/response";

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

function createErrorResponse(code: number, message: string, details?: unknown): ErrorResponse {
  return details !== undefined ? { code, message, details } : { code, message };
}

function getRouteInfo(request: Request): { method: string; path: string } {
  const url = new URL(request.url);
  return { method: request.method, path: url.pathname };
}

/**
 * Global error handling plugin.
 * Catches unhandled errors and returns consistent JSON error responses.
 * Sanitizes error messages to prevent leaking sensitive values.
 * In production, stack traces are never returned to clients.
 */
export const errorMiddleware = new Elysia({ name: "error-handler" }).onError(
  { as: "global" },
  ({ code, error, set, request }) => {
    const route = getRouteInfo(request);

    if (error instanceof HttpError) {
      set.status = error.statusCode;
      const safeMessage = sanitizeErrorMessage(error.message);
      logger.warn({ statusCode: error.statusCode, message: safeMessage, ...route }, "HTTP error");
      return createErrorResponse(error.statusCode, safeMessage);
    }

    switch (code) {
      case "VALIDATION":
        set.status = 400;
        logger.warn(
          { statusCode: 400, ...route, message: sanitizeErrorMessage(error.message) },
          "Validation error",
        );
        return createErrorResponse(
          400,
          "Validation error",
          isProduction ? undefined : sanitizeErrorMessage(error.message),
        );
      case "PARSE":
        set.status = 400;
        logger.warn({ statusCode: 400, ...route }, "Malformed request body");
        return createErrorResponse(400, "Malformed request body");
      case "NOT_FOUND":
        set.status = 404;
        return createErrorResponse(404, "Not found");
      default: {
        const safeMessage = isPrismaError(error as Error)
          ? "Internal server error"
          : sanitizeErrorMessage((error as Error).message ?? "");

        logger.error(
          {
            code,
            message: safeMessage,
            ...route,
            ...(isProduction ? {} : { stack: (error as Error).stack }),
          },
          "Unhandled error",
        );

        set.status = 500;
        return createErrorResponse(500, "Internal server error");
      }
    }
  },
);
