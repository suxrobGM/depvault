import { singleton } from "tsyringe";
import { NotFoundError } from "@/common/errors";
import { PrismaClient, type App } from "@/generated/prisma";

@singleton()
export class AppRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Resolve an app scoped to a project, throwing if it does not exist. */
  async requireApp(projectId: string, appId: string): Promise<App> {
    const app = await this.prisma.app.findFirst({
      where: { id: appId, projectId },
    });

    if (!app) {
      throw new NotFoundError("App not found");
    }

    return app;
  }

  /**
   * Get-or-create an app by its repo path. Used by push flows that target an
   * app identified by `appPath` without knowing its id ahead of time.
   */
  async upsertByPath(projectId: string, appPath: string, name: string): Promise<App> {
    return this.prisma.app.upsert({
      where: { projectId_appPath: { projectId, appPath } },
      create: { projectId, appPath, name },
      update: {},
    });
  }
}
