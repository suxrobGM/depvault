import { Elysia } from "elysia";
import { HttpError } from "@/common/errors";
import { logger } from "@/common/utils/logger";

/**
 * Global error handling plugin.
 * Catches unhandled errors and returns consistent JSON error responses.
 */
export const errorMiddleware = new Elysia({ name: "error-handler" }).onError(
  ({ code, error, set }) => {
    // Handle our own HttpError subclasses
    if (error instanceof HttpError) {
      set.status = error.statusCode;
      logger.warn({ statusCode: error.statusCode, message: error.message }, "HTTP error");
      return { code: error.statusCode, message: error.message };
    }

    // Elysia built-in error codes
    switch (code) {
      case "VALIDATION":
        set.status = 400;
        return { code: 400, message: "Validation error", details: error.message };
      case "NOT_FOUND":
        set.status = 404;
        return { code: 404, message: "Not found" };
      default:
        logger.error({ err: error, code }, "Unhandled error");
        set.status = 500;
        return { code: 500, message: "Internal server error" };
    }
  },
);
