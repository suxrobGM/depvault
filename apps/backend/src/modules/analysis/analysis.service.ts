import { singleton } from "tsyringe";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/common/errors";
import { logger } from "@/common/logger";
import { DependencyStatus, PrismaClient, ProjectRole, type Ecosystem } from "@/generated/prisma";
import { NotificationService } from "@/modules/notification";
import type { PaginatedResponse } from "@/types/response";
import type {
  AnalysisResponse,
  AnalysisSummaryResponse,
  CreateAnalysisBody,
  UpdateAnalysisBody,
} from "./analysis.schema";
import { calculateHealthScore } from "./analysis.utils";
import { checkVersions, resolveLicensePolicy, scanVulnerabilities } from "./checkers";
import { nodejsParser, pythonParser, type DependencyParser } from "./parsers";

const PARSERS: Record<string, DependencyParser> = {
  NODEJS: nodejsParser,
  PYTHON: pythonParser,
};

const INCLUDE_DEPS_WITH_VULNS = {
  dependencies: { include: { vulnerabilities: true } },
} as const;

@singleton()
export class AnalysisService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly notificationService: NotificationService,
  ) {}

  async create(
    body: CreateAnalysisBody & { projectId: string },
    userId: string,
  ): Promise<AnalysisResponse> {
    await this.requireEditor(body.projectId, userId, "create");

    const parser = PARSERS[body.ecosystem];
    if (!parser) {
      throw new BadRequestError(`Unsupported ecosystem: ${body.ecosystem}`);
    }

    const fileBaseName = body.fileName.split("/").pop() ?? body.fileName;

    if (!parser.canParse(fileBaseName)) {
      throw new BadRequestError(
        `Unsupported file "${body.fileName}" for ${body.ecosystem} ecosystem`,
      );
    }

    const parseResult = parser.parse(body.content, fileBaseName);

    const analysis = await this.prisma.analysis.create({
      data: {
        projectId: body.projectId,
        userId,
        fileName: fileBaseName,
        filePath: body.filePath ?? null,
        ecosystem: body.ecosystem,
        dependencies: {
          create: parseResult.dependencies.map((dep) => ({
            name: dep.name,
            currentVersion: dep.version,
            isDirect: dep.isDirect,
          })),
        },
      },
      include: INCLUDE_DEPS_WITH_VULNS,
    });

    const updatedDeps = await this.scanAndUpdateDeps(
      analysis.dependencies,
      body.ecosystem,
      body.projectId,
    );
    const healthScore = calculateHealthScore(updatedDeps);

    if (healthScore !== null) {
      await this.prisma.analysis.update({
        where: { id: analysis.id },
        data: { healthScore },
      });
    }

    const vulnCount = updatedDeps.reduce((n, d) => n + d.vulnerabilities.length, 0);
    if (vulnCount > 0) {
      void this.notificationService.notify({
        type: "VULNERABILITY_FOUND",
        userId,
        projectId: body.projectId,
        count: vulnCount,
      });
    }

    return { ...analysis, healthScore, dependencies: updatedDeps };
  }

  async list(
    projectId: string,
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<AnalysisSummaryResponse>> {
    await this.requireMember(projectId, userId);

    const where = { projectId };

    const [rows, total] = await Promise.all([
      this.prisma.analysis.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { dependencies: true } } },
      }),
      this.prisma.analysis.count({ where }),
    ]);

    const items = rows.map(({ _count, ...rest }) => ({
      ...rest,
      dependencyCount: _count.dependencies,
    }));

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(projectId: string, analysisId: string, userId: string): Promise<AnalysisResponse> {
    await this.requireMember(projectId, userId);
    return this.findAnalysisOrThrow(analysisId, projectId, true);
  }

  async delete(
    projectId: string,
    analysisId: string,
    userId: string,
  ): Promise<{ message: string }> {
    await this.requireEditor(projectId, userId, "delete");
    await this.findAnalysisOrThrow(analysisId, projectId, false);
    await this.prisma.analysis.delete({ where: { id: analysisId } });
    return { message: "Analysis deleted successfully" };
  }

  async updateFilePath(
    projectId: string,
    analysisId: string,
    userId: string,
    body: UpdateAnalysisBody,
  ): Promise<AnalysisResponse> {
    await this.requireEditor(projectId, userId, "update");
    await this.findAnalysisOrThrow(analysisId, projectId, false);

    return this.prisma.analysis.update({
      where: { id: analysisId },
      data: {
        ...(body.filePath !== undefined && { filePath: body.filePath }),
      },
      include: INCLUDE_DEPS_WITH_VULNS,
    });
  }

  async rescan(projectId: string, analysisId: string, userId: string): Promise<AnalysisResponse> {
    await this.requireEditor(projectId, userId, "rescan");
    const analysis = await this.findAnalysisOrThrow(analysisId, projectId, true);

    await this.prisma.vulnerability.deleteMany({
      where: { dependency: { analysisId } },
    });

    const updatedDeps = await this.scanAndUpdateDeps(
      analysis.dependencies,
      analysis.ecosystem,
      projectId,
    );
    const healthScore = calculateHealthScore(updatedDeps);

    await this.prisma.analysis.update({
      where: { id: analysisId },
      data: { healthScore },
    });

    const vulnCount = updatedDeps.reduce((n, d) => n + d.vulnerabilities.length, 0);
    if (vulnCount > 0) {
      void this.notificationService.notify({
        type: "VULNERABILITY_FOUND",
        userId,
        projectId: analysis.projectId,
        count: vulnCount,
      });
    }

    return { ...analysis, healthScore, dependencies: updatedDeps };
  }

  // --- Private helpers ---

  private async requireMember(projectId: string, userId: string): Promise<void> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member) {
      throw new NotFoundError("Project not found");
    }
  }

  private async requireEditor(projectId: string, userId: string, action: string): Promise<void> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member) {
      throw new NotFoundError("Project not found");
    }

    if (member.role === ProjectRole.VIEWER) {
      throw new ForbiddenError(`Viewers cannot ${action} analyses`);
    }
  }

  private async findAnalysisOrThrow(
    analysisId: string,
    projectId: string,
    includeDeps: true,
  ): Promise<AnalysisResponse>;

  private async findAnalysisOrThrow(
    analysisId: string,
    projectId: string,
    includeDeps: false,
  ): Promise<{ id: string }>;

  private async findAnalysisOrThrow(analysisId: string, projectId: string, includeDeps: boolean) {
    const analysis = await this.prisma.analysis.findFirst({
      where: { id: analysisId, projectId },
      ...(includeDeps && { include: INCLUDE_DEPS_WITH_VULNS }),
    });

    if (!analysis) {
      throw new NotFoundError("Analysis not found");
    }

    return analysis;
  }

  private async scanAndUpdateDeps(
    dependencies: Array<{ id: string; name: string; currentVersion: string }>,
    ecosystem: Ecosystem,
    projectId: string,
  ) {
    const depInputs = dependencies.map((d) => ({
      name: d.name,
      currentVersion: d.currentVersion,
    }));

    const [versionResults, vulnResults, licenseRules] = await Promise.all([
      checkVersions(depInputs, ecosystem).catch((err) => {
        logger.warn(`Version check failed: ${err}`);
        return [];
      }),
      scanVulnerabilities(depInputs, ecosystem).catch((err) => {
        logger.warn(`Vulnerability scan failed: ${err}`);
        return [];
      }),
      this.prisma.licenseRule.findMany({ where: { projectId } }),
    ]);

    const versionByName = new Map(versionResults.map((v) => [v.name, v]));
    const vulnsByName = new Map<string, typeof vulnResults>();

    for (const vuln of vulnResults) {
      const existing = vulnsByName.get(vuln.packageName) ?? [];
      existing.push(vuln);
      vulnsByName.set(vuln.packageName, existing);
    }

    const updateOps = dependencies.map((dep) => {
      const version = versionByName.get(dep.name);
      const vulns = vulnsByName.get(dep.name) ?? [];
      const license = version?.license ?? null;
      const licensePolicy = resolveLicensePolicy(license, licenseRules);

      return this.prisma.dependency.update({
        where: { id: dep.id },
        data: {
          latestVersion: version?.latestVersion ?? null,
          status: version?.status ?? DependencyStatus.UP_TO_DATE,
          license,
          licensePolicy,
          ...(vulns.length > 0 && {
            vulnerabilities: {
              create: vulns.map((v) => ({
                cveId: v.cveId,
                title: v.title,
                description: v.description,
                severity: v.severity,
                fixedIn: v.fixedIn,
                url: v.url,
              })),
            },
          }),
        },
        include: { vulnerabilities: true },
      });
    });

    return Promise.all(updateOps);
  }
}
