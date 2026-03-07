import { Elysia } from "elysia";
import { HttpError } from "@/common/errors";
import { logger } from "@/common/logger/logger";

const SENSITIVE_PATTERN =
  /(?:password|secret|token|key|encrypted|ciphertext|plaintext|authorization|apikey|private_key)\s*[=:]\s*\S+/gi;

function sanitizeErrorMessage(message: string): string {
  return message.replace(SENSITIVE_PATTERN, "[REDACTED]");
}

/**
 * Global error handling plugin.
 * Catches unhandled errors and returns consistent JSON error responses.
 * Sanitizes error messages to prevent leaking sensitive values.
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
          details: sanitizeErrorMessage(error.message),
        };
      case "NOT_FOUND":
        set.status = 404;
        return { code: 404, message: "Not found" };
      default:
        logger.error({ code }, "Unhandled error");
        set.status = 500;
        return { code: 500, message: "Internal server error" };
    }
  },
);
