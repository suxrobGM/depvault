import { Elysia } from "elysia";
import { logger } from "@/common/logger";

/**
 * Elysia plugin for logging incoming requests and outgoing responses.
 */
export const requestLoggerPlugin = new Elysia({ name: "request-logger" })
  .onRequest(({ request }) => {
    logger.info(`${request.method} ${request.url}`);
  })
  .onAfterResponse(({ request, set }) => {
    logger.info(`${request.method} ${request.url} → ${set.status || 200}`);
  });
