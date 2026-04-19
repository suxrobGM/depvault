import { singleton } from "tsyringe";
import { BadRequestError, NotFoundError } from "@/common/errors";
import { parseGitHubUrl } from "@/common/utils/github";
import {
  DetectionSeverity,
  DetectionStatus,
  PrismaClient,
  ScanStatus,
  type Prisma,
} from "@/generated/prisma";
import { GitHubApiService } from "@/modules/github/github-api.service";
import { NotificationService } from "@/modules/notification/notification.service";
import { PlanEnforcementService } from "@/modules/subscription/plan-enforcement.service";
import type { PaginatedResponse } from "@/types/response";
import { executeScan } from "./secret-scan.executor";
import { toDetectionResponse, toScanResponse } from "./secret-scan.mapper";
import type {
  BatchUpdateDetectionsBody,
  BatchUpdateDetectionsResponse,
  DetectionListQuery,
  DetectionResponse,
  ScanResponse,
  ScanSummaryResponse,
  UpdateDetectionBody,
} from "./secret-scan.schema";

@singleton()
export class SecretScanService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly githubApi: GitHubApiService,
    private readonly notificationService: NotificationService,
    private readonly planEnforcement: PlanEnforcementService,
  ) {}

  async triggerScan(projectId: string, userId: string): Promise<ScanResponse> {
    await this.planEnforcement.enforceFeatureForProject(projectId, "gitSecretScanning");

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { repositoryUrl: true },
    });

    if (!project?.repositoryUrl) {
      throw new BadRequestError("Project has no connected GitHub repository");
    }

    const parsed = parseGitHubUrl(project.repositoryUrl);
    if (!parsed) {
      throw new BadRequestError("Invalid GitHub repository URL");
    }

    const scan = await this.prisma.secretScan.create({
      data: {
        projectId,
        triggeredById: userId,
        status: ScanStatus.PENDING,
      },
    });

    void executeScan(
      this.prisma,
      this.githubApi,
      this.notificationService,
      scan.id,
      projectId,
      userId,
      parsed.owner,
      parsed.repo,
    );

    return toScanResponse(scan);
  }

  async listScans(
    projectId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<ScanResponse>> {
    const where = { projectId };
    const [rows, total] = await Promise.all([
      this.prisma.secretScan.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.secretScan.count({ where }),
    ]);

    return {
      items: rows.map(toScanResponse),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getScan(projectId: string, scanId: string): Promise<ScanResponse> {
    const scan = await this.prisma.secretScan.findFirst({
      where: { id: scanId, projectId },
    });

    if (!scan) throw new NotFoundError("Scan not found");

    return toScanResponse(scan);
  }

  async listDetections(
    projectId: string,
    filters: DetectionListQuery,
  ): Promise<PaginatedResponse<DetectionResponse>> {
    const { page, limit, status, severity } = filters;

    const where: Prisma.SecretDetectionWhereInput = {
      projectId,
      ...(status && { status }),
      ...(severity && { scanPattern: { severity } }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.secretDetection.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { scanPattern: { select: { name: true, severity: true } } },
      }),
      this.prisma.secretDetection.count({ where }),
    ]);

    return {
      items: rows.map(toDetectionResponse),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateDetectionStatus(
    projectId: string,
    detectionId: string,
    body: UpdateDetectionBody,
    userId: string,
  ): Promise<DetectionResponse> {
    const detection = await this.prisma.secretDetection.findFirst({
      where: { id: detectionId, projectId },
    });

    if (!detection) {
      throw new NotFoundError("Detection not found");
    }

    const updated = await this.prisma.secretDetection.update({
      where: { id: detectionId },
      data: {
        status: body.status,
        resolvedById: userId,
        resolvedAt: new Date(),
      },
      include: { scanPattern: { select: { name: true, severity: true } } },
    });

    return toDetectionResponse(updated);
  }

  async batchUpdateDetections(
    projectId: string,
    body: BatchUpdateDetectionsBody,
    userId: string,
  ): Promise<BatchUpdateDetectionsResponse> {
    const { count } = await this.prisma.secretDetection.updateMany({
      where: {
        id: { in: body.detectionIds },
        projectId,
        status: DetectionStatus.OPEN,
      },
      data: {
        status: body.status,
        resolvedById: userId,
        resolvedAt: new Date(),
      },
    });

    return { updatedCount: count };
  }

  async getScanSummary(projectId: string): Promise<ScanSummaryResponse> {
    const [lastScan, openCounts, totalResolved] = await Promise.all([
      this.prisma.secretScan.findFirst({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.secretDetection.groupBy({
        by: ["scanPatternId"],
        where: { projectId, status: DetectionStatus.OPEN },
        _count: true,
      }),
      this.prisma.secretDetection.count({
        where: {
          projectId,
          status: { in: [DetectionStatus.RESOLVED, DetectionStatus.FALSE_POSITIVE] },
        },
      }),
    ]);

    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };

    if (openCounts.length > 0) {
      const patternIds = openCounts.map((c) => c.scanPatternId);
      const patterns = await this.prisma.scanPattern.findMany({
        where: { id: { in: patternIds } },
        select: { id: true, severity: true },
      });
      const severityMap = new Map(patterns.map((p) => [p.id, p.severity]));

      for (const group of openCounts) {
        const severity = severityMap.get(group.scanPatternId);
        if (severity === DetectionSeverity.CRITICAL) severityCounts.critical += group._count;
        else if (severity === DetectionSeverity.HIGH) severityCounts.high += group._count;
        else if (severity === DetectionSeverity.MEDIUM) severityCounts.medium += group._count;
        else if (severity === DetectionSeverity.LOW) severityCounts.low += group._count;
      }
    }

    return {
      lastScan: lastScan ? toScanResponse(lastScan) : null,
      openDetections: severityCounts,
      totalResolved,
    };
  }
}
