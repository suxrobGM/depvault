import "@/common/di/container";
import { Elysia } from "elysia";
import { prisma } from "@/common/database";
import { errorMiddleware } from "@/common/middleware";
import { corsPlugin, swaggerPlugin } from "@/common/plugins";
import { logger } from "@/common/utils/logger";
import { validateEnv } from "@/env";
import { authController } from "@/modules/auth";
import { ErrorResponseSchema, HttpErrorResponses } from "./types/response";

// Validate environment
const env = validateEnv();
const port = parseInt(env.PORT ?? "4000");

const app = new Elysia()
  // Infrastructure plugins
  .use(errorMiddleware)
  .use(corsPlugin)
  .use(swaggerPlugin)
  .onStop(async () => {
    await prisma.$disconnect();
  })

  // Health check
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))

  // Feature modules
  .group("/api", (api) =>
    api
      .guard({
        response: HttpErrorResponses,
      })
      .use(authController),
  )
  .listen(port);

// Export app type for Eden Treaty
export type App = typeof app;

logger.info(`Connect API running at http://${app.server?.hostname}:${app.server?.port}`);

if (env.NODE_ENV === "development") {
  logger.info(
    `Swagger docs available at http://${app.server?.hostname}:${app.server?.port}/swagger`,
  );
}
