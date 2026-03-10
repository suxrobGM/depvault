import { singleton } from "tsyringe";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/common/errors";
import { logger } from "@/common/logger";
import { PrismaClient } from "@/generated/prisma";
import type { PaginatedResponse } from "@/types/response";
import type {
  AnalysisResponse,
  AnalysisSummaryResponse,
  CreateAnalysisBody,
} from "./analysis.schema";
import { checkVersions, scanVulnerabilities } from "./checkers";
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
  constructor(private readonly prisma: PrismaClient) {}

  async create(body: CreateAnalysisBody, userId: string): Promise<AnalysisResponse> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: body.projectId, userId } },
    });

    if (!member) {
      throw new NotFoundError("Project not found");
    }

    if (member.role === "VIEWER") {
      throw new ForbiddenError("Viewers cannot create analyses");
    }

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

    const depInputs = analysis.dependencies.map((d) => ({
      name: d.name,
      currentVersion: d.currentVersion,
    }));

    const [versionResults, vulnResults] = await Promise.all([
      checkVersions(depInputs, body.ecosystem).catch((err) => {
        logger.warn(`Version check failed: ${err}`);
        return [];
      }),
      scanVulnerabilities(depInputs, body.ecosystem).catch((err) => {
        logger.warn(`Vulnerability scan failed: ${err}`);
        return [];
      }),
    ]);

    const versionByName = new Map(versionResults.map((v) => [v.name, v]));
    const vulnsByName = new Map<string, typeof vulnResults>();
    for (const vuln of vulnResults) {
      const existing = vulnsByName.get(vuln.packageName) ?? [];
      existing.push(vuln);
      vulnsByName.set(vuln.packageName, existing);
    }

    const updateOps = analysis.dependencies.map((dep) => {
      const version = versionByName.get(dep.name);
      const vulns = vulnsByName.get(dep.name) ?? [];

      return this.prisma.dependency.update({
        where: { id: dep.id },
        data: {
          latestVersion: version?.latestVersion ?? null,
          status: version?.status ?? "UP_TO_DATE",
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

    const updatedDeps = await Promise.all(updateOps);

    const healthScore = this.calculateHealthScore(updatedDeps);
    if (healthScore !== null) {
      await this.prisma.analysis.update({
        where: { id: analysis.id },
        data: { healthScore },
      });
    }

    return {
      ...analysis,
      healthScore,
      dependencies: updatedDeps,
    };
  }

  async list(
    projectId: string,
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<AnalysisSummaryResponse>> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member) {
      throw new NotFoundError("Project not found");
    }

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
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(projectId: string, analysisId: string, userId: string): Promise<AnalysisResponse> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member) {
      throw new NotFoundError("Project not found");
    }

    const analysis = await this.prisma.analysis.findFirst({
      where: { id: analysisId, projectId },
      include: INCLUDE_DEPS_WITH_VULNS,
    });

    if (!analysis) {
      throw new NotFoundError("Analysis not found");
    }

    return analysis;
  }

  async delete(
    projectId: string,
    analysisId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member) {
      throw new NotFoundError("Project not found");
    }

    if (member.role === "VIEWER") {
      throw new ForbiddenError("Viewers cannot delete analyses");
    }

    const analysis = await this.prisma.analysis.findFirst({
      where: { id: analysisId, projectId },
    });

    if (!analysis) {
      throw new NotFoundError("Analysis not found");
    }

    await this.prisma.analysis.delete({ where: { id: analysisId } });

    return { message: "Analysis deleted successfully" };
  }

  private calculateHealthScore(
    dependencies: Array<{ status: string; vulnerabilities: unknown[] }>,
  ): number | null {
    if (dependencies.length === 0) return null;

    let score = 100;
    for (const dep of dependencies) {
      if (dep.status === "MAJOR_UPDATE") score -= 5;
      else if (dep.status === "MINOR_UPDATE") score -= 2;
      else if (dep.status === "DEPRECATED") score -= 10;

      for (const vuln of dep.vulnerabilities as Array<{ severity: string }>) {
        if (vuln.severity === "CRITICAL") score -= 15;
        else if (vuln.severity === "HIGH") score -= 10;
        else if (vuln.severity === "MEDIUM") score -= 5;
        else if (vuln.severity === "LOW") score -= 2;
      }
    }

    return Math.max(0, Math.min(100, score));
  }
}
