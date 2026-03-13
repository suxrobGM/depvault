import { logger } from "@/common/logger";
import { DetectionSeverity, PrismaClient, ProjectRole, ScanStatus } from "@/generated/prisma";
import type { GitHubApiService } from "@/modules/github/github-api.service";
import type { NotificationService } from "@/modules/notification/notification.service";
import { scanCommitHistory } from "./secret-scan.engine";
import { BUILT_IN_PATTERNS } from "./secret-scan.patterns";

/** Executes a scan in the background and persists results. */
export async function executeScan(
  prisma: PrismaClient,
  githubApi: GitHubApiService,
  notificationService: NotificationService,
  scanId: string,
  projectId: string,
  userId: string,
  owner: string,
  repo: string,
): Promise<void> {
  try {
    await prisma.secretScan.update({
      where: { id: scanId },
      data: { status: ScanStatus.RUNNING, startedAt: new Date() },
    });

    const customPatterns = await prisma.scanPattern.findMany({
      where: { projectId },
    });

    const allPatterns = [
      ...BUILT_IN_PATTERNS.map((p, i) => ({
        id: `builtin-${i}`,
        name: p.name,
        regex: p.regex,
        severity: p.severity,
        remediation: p.remediation,
      })),
      ...customPatterns.map((p) => ({
        id: p.id,
        name: p.name,
        regex: p.regex,
        severity: p.severity,
        remediation: undefined,
      })),
    ];

    const result = await scanCommitHistory(githubApi, userId, owner, repo, allPatterns);

    const builtInDbPatterns = await ensureBuiltInPatterns(prisma);
    const builtInIdMap = new Map(builtInDbPatterns.map((p) => [p.name, p.id]));
    const customIdMap = new Map(customPatterns.map((p) => [p.name, p.id]));

    if (result.detections.length > 0) {
      await prisma.secretDetection.createMany({
        data: result.detections.map((d) => ({
          projectId,
          scanId,
          scanPatternId: builtInIdMap.get(d.patternName) ?? customIdMap.get(d.patternName) ?? "",
          commitHash: d.commitHash,
          filePath: d.filePath,
          lineNumber: d.lineNumber,
          matchSnippet: d.matchSnippet,
          remediationSteps: d.remediationSteps,
        })),
      });
    }

    await prisma.secretScan.update({
      where: { id: scanId },
      data: {
        status: ScanStatus.COMPLETED,
        completedAt: new Date(),
        commitsScanned: result.commitsScanned,
        detectionsFound: result.detections.length,
      },
    });

    if (result.detections.length > 0) {
      await notifyOwner(prisma, notificationService, projectId, result);
    }
  } catch (error) {
    logger.error({ error, scanId }, "Secret scan failed");
    await prisma.secretScan.update({
      where: { id: scanId },
      data: {
        status: ScanStatus.FAILED,
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

async function notifyOwner(
  prisma: PrismaClient,
  notificationService: NotificationService,
  projectId: string,
  result: { detections: { severity: string; filePath: string }[] },
): Promise<void> {
  const breakdown = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const d of result.detections) {
    if (d.severity === "CRITICAL") breakdown.critical++;
    else if (d.severity === "HIGH") breakdown.high++;
    else if (d.severity === "MEDIUM") breakdown.medium++;
    else breakdown.low++;
  }

  const projectOwner = await prisma.projectMember.findFirst({
    where: { projectId, role: ProjectRole.OWNER },
    select: { userId: true },
  });

  if (projectOwner) {
    void notificationService.notify({
      type: "GIT_SECRET_DETECTION",
      userId: projectOwner.userId,
      projectId,
      fileName: result.detections[0]!.filePath,
      count: result.detections.length,
      severityBreakdown: breakdown,
    });
  }
}

/** Upserts built-in patterns to DB so they can be FK-referenced by detections. */
export async function ensureBuiltInPatterns(prisma: PrismaClient) {
  const existing = await prisma.scanPattern.findMany({
    where: { isBuiltIn: true },
    select: { id: true, name: true },
  });

  if (existing.length === BUILT_IN_PATTERNS.length) {
    return existing;
  }

  const existingNames = new Set(existing.map((p) => p.name));
  const toCreate = BUILT_IN_PATTERNS.filter((p) => !existingNames.has(p.name));

  if (toCreate.length > 0) {
    await prisma.scanPattern.createMany({
      data: toCreate.map((p) => ({
        name: p.name,
        regex: p.regex,
        severity: p.severity as DetectionSeverity,
        isBuiltIn: true,
      })),
    });
  }

  return prisma.scanPattern.findMany({
    where: { isBuiltIn: true },
    select: { id: true, name: true },
  });
}
