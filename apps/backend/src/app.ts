import "@/common/di/container";
import { Elysia } from "elysia";
import { prisma } from "@/common/database";
import { logger } from "@/common/logger";
import { errorMiddleware } from "@/common/middleware";
import { corsPlugin, swaggerPlugin } from "@/common/plugins";
import { uploadsStaticPlugin } from "@/common/plugins/static.plugin";
import { validateEnv } from "@/env";
import { secretScanCron } from "@/jobs/secret-scan.job";
import { activityController } from "@/modules/activity/activity.controller";
import { adminController } from "@/modules/admin";
import { analysisController } from "@/modules/analysis";
import { auditLogController } from "@/modules/audit-log/audit-log.controller";
import { authController } from "@/modules/auth";
import { ciAccessController, ciTokenController } from "@/modules/ci-token";
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
import { invitationController, projectInvitationController } from "@/modules/invitation";
import { licenseRuleController } from "@/modules/license-rule";
import { notificationController } from "@/modules/notification";
import { projectController } from "@/modules/project";
import { scanPatternController } from "@/modules/scan-pattern";
import { secretController, secretFileController, sharedSecretController } from "@/modules/secret";
import { secretScanController } from "@/modules/secret-scan";
import { securityController } from "@/modules/security/security.controller";
import { subscriptionController, subscriptionWebhookController } from "@/modules/subscription";
import { userController } from "@/modules/user";
import { keyGrantController, vaultController } from "@/modules/vault";
import { vaultGroupController } from "@/modules/vault-group";
import { HttpErrorResponses } from "@/types/response";

// Validate environment
validateEnv();

const app = new Elysia()
  .use(errorMiddleware)
  .use(corsPlugin)
  .use(uploadsStaticPlugin)
  .use(secretScanCron)
  .use(swaggerPlugin)
  .onStop(async () => {
    await prisma.$disconnect();
  })
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  .group("/api", (api) =>
    api
      .guard({
        response: HttpErrorResponses,
      })
      .use(subscriptionWebhookController)
      .use(authController)
      .use(projectController)
      .use(invitationController)
      .use(projectInvitationController)
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
      .use(notificationController)
      .use(secretScanController)
      .use(scanPatternController)
      .use(ciTokenController)
      .use(ciAccessController)
      .use(licenseRuleController)
      .use(activityController)
      .use(securityController)
      .use(subscriptionController)
      .use(vaultController)
      .use(keyGrantController)
      .use(adminController),
  )
  .listen(process.env.PORT!);

// Export app type for Eden Treaty
export type App = typeof app;

logger.info(`Connect API running at http://${app.server?.hostname}:${app.server?.port}`);
logger.info(
  `Swagger docs available at http://${app.server?.hostname}:${app.server?.port}/api/swagger`,
);
