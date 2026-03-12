import { cron, Patterns } from "@elysiajs/cron";
import { sleep } from "bun";
import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { logger } from "@/common/logger";
import { PrismaClient, ProjectRole } from "@/generated/prisma";
import { SecretScanService } from "@/modules/secret-scan";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DELAY_BETWEEN_SCANS_MS = 5000;

async function runScheduledScans(): Promise<void> {
  const prisma = container.resolve(PrismaClient);
  const secretScanService = container.resolve(SecretScanService);

  try {
    const projects = await prisma.project.findMany({
      where: { repositoryUrl: { not: null } },
      select: {
        id: true,
        name: true,
        members: {
          where: { role: ProjectRole.OWNER },
          select: { userId: true },
          take: 1,
        },
      },
    });

    const oneDayAgo = new Date(Date.now() - ONE_DAY_MS);

    for (const project of projects) {
      const owner = project.members[0];
      if (!owner) continue;

      const lastScan = await prisma.secretScan.findFirst({
        where: { projectId: project.id },
        orderBy: { createdAt: "desc" },
        select: { completedAt: true },
      });

      if (lastScan?.completedAt && lastScan.completedAt > oneDayAgo) {
        continue;
      }

      try {
        await secretScanService.triggerScan(project.id, owner.userId);
        logger.info({ projectId: project.id, projectName: project.name }, "Scheduled scan started");
      } catch (error) {
        logger.warn({ error, projectId: project.id }, "Scheduled scan failed to start");
      }

      await sleep(DELAY_BETWEEN_SCANS_MS);
    }
  } catch (error) {
    logger.error({ error }, "Scheduled secret scan job failed");
  }
}

/** Elysia plugin that schedules daily secret scans at midnight. */
export const secretScanCron = new Elysia({ name: "secret-scan-cron" }).use(
  cron({
    name: "secret-scan",
    pattern: Patterns.EVERY_DAY_AT_MIDNIGHT,
    catch: true,
    run: () => {
      logger.info("Running scheduled secret scan job");
      void runScheduledScans();
    },
  }),
) as unknown as Elysia;
