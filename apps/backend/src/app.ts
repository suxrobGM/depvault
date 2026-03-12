import "@/common/di/container";
import { Elysia } from "elysia";
import { prisma } from "@/common/database";
import { logger } from "@/common/logger";
import { errorMiddleware } from "@/common/middleware";
import { corsPlugin, swaggerPlugin } from "@/common/plugins";
import { uploadsStaticPlugin } from "@/common/plugins/static.plugin";
import { validateEnv } from "@/env";
import { analysisController } from "@/modules/analysis";
import { auditLogController } from "@/modules/audit-log/audit-log.controller";
import { authController } from "@/modules/auth";
import { convertController } from "@/modules/convert";
import { envTemplateController } from "@/modules/env-template";
import {
  envBundleController,
  envDiffController,
  envIOController,
  environmentController,
  envVariableController,
} from "@/modules/environment";
import { githubApiController } from "@/modules/github";
import { notificationController } from "@/modules/notification";
import { projectController } from "@/modules/project";
import { secretController, secretFileController, sharedSecretController } from "@/modules/secret";
import { userController } from "@/modules/user";
import { vaultGroupController } from "@/modules/vault-group";
import { HttpErrorResponses } from "./types/response";

// Validate environment
validateEnv();

const app = new Elysia()
  .use(errorMiddleware)
  .use(corsPlugin)
  .use(swaggerPlugin)
  .use(uploadsStaticPlugin)
  .onStop(async () => {
    await prisma.$disconnect();
  })
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  .group("/api", (api) =>
    api
      .guard({
        response: HttpErrorResponses,
      })
      .use(authController)
      .use(projectController)
      .use(vaultGroupController)
      .use(environmentController)
      .use(envVariableController)
      .use(envDiffController)
      .use(envIOController)
      .use(envBundleController)
      .use(envTemplateController)
      .use(secretFileController)
      .use(secretController)
      .use(sharedSecretController)
      .use(userController)
      .use(auditLogController)
      .use(analysisController)
      .use(convertController)
      .use(githubApiController)
      .use(notificationController),
  )
  .listen(process.env.PORT!);

// Export app type for Eden Treaty
export type App = typeof app;

logger.info(`Connect API running at http://${app.server?.hostname}:${app.server?.port}`);

if (process.env.NODE_ENV === "development") {
  logger.info(
    `Swagger docs available at http://${app.server?.hostname}:${app.server?.port}/swagger`,
  );
}
