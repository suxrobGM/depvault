import { singleton } from "tsyringe";
import { ConflictError, ForbiddenError, NotFoundError } from "@/common/errors";
import { PrismaClient, ProjectRole } from "@/generated/prisma";
import type {
  CreateLicenseRuleBody,
  LicenseComplianceSummary,
  LicenseRuleResponse,
  UpdateLicenseRuleBody,
} from "./license-rule.schema";

@singleton()
export class LicenseRuleService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(projectId: string, userId: string): Promise<{ items: LicenseRuleResponse[] }> {
    await this.requireMember(projectId, userId);

    const rules = await this.prisma.licenseRule.findMany({
      where: { projectId },
      orderBy: { licenseId: "asc" },
    });

    return { items: rules };
  }

  async create(
    projectId: string,
    userId: string,
    body: CreateLicenseRuleBody,
  ): Promise<LicenseRuleResponse> {
    await this.requireEditor(projectId, userId);

    const existing = await this.prisma.licenseRule.findUnique({
      where: { projectId_licenseId: { projectId, licenseId: body.licenseId } },
    });

    if (existing) {
      throw new ConflictError(`Rule for license "${body.licenseId}" already exists`);
    }

    return this.prisma.licenseRule.create({
      data: { projectId, licenseId: body.licenseId, policy: body.policy },
    });
  }

  async update(
    projectId: string,
    ruleId: string,
    userId: string,
    body: UpdateLicenseRuleBody,
  ): Promise<LicenseRuleResponse> {
    await this.requireEditor(projectId, userId);

    const rule = await this.prisma.licenseRule.findFirst({
      where: { id: ruleId, projectId },
    });

    if (!rule) throw new NotFoundError("License rule not found");

    return this.prisma.licenseRule.update({
      where: { id: ruleId },
      data: { policy: body.policy },
    });
  }

  async delete(projectId: string, ruleId: string, userId: string): Promise<{ message: string }> {
    await this.requireEditor(projectId, userId);

    const rule = await this.prisma.licenseRule.findFirst({
      where: { id: ruleId, projectId },
    });

    if (!rule) throw new NotFoundError("License rule not found");

    await this.prisma.licenseRule.delete({ where: { id: ruleId } });

    return { message: "License rule deleted successfully" };
  }

  async getComplianceSummary(
    projectId: string,
    userId: string,
    page = 1,
    limit = 25,
    search?: string,
  ): Promise<LicenseComplianceSummary> {
    await this.requireMember(projectId, userId);

    const baseWhere = { analysis: { projectId } };
    const searchWhere = search
      ? {
          ...baseWhere,
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { license: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : baseWhere;

    const [allDeps, filteredTotal, paginatedDeps] = await Promise.all([
      this.prisma.dependency.findMany({
        where: baseWhere,
        select: { license: true, licensePolicy: true },
      }),

      this.prisma.dependency.count({ where: searchWhere }),

      this.prisma.dependency.findMany({
        where: searchWhere,
        select: {
          name: true,
          license: true,
          licensePolicy: true,
          analysis: { select: { fileName: true } },
        },
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    let allowed = 0;
    let warned = 0;
    let blocked = 0;
    let unknown = 0;

    for (const dep of allDeps) {
      if (!dep.license) unknown++;
      else if (dep.licensePolicy === "ALLOW") allowed++;
      else if (dep.licensePolicy === "WARN") warned++;
      else if (dep.licensePolicy === "BLOCK") blocked++;
    }

    const items = paginatedDeps.map((dep) => ({
      name: dep.name,
      license: dep.license,
      licensePolicy: dep.licensePolicy,
      analysisFileName: dep.analysis.fileName,
    }));

    return {
      total: allDeps.length,
      allowed,
      warned,
      blocked,
      unknown,
      dependencies: items,
      pagination: {
        page,
        limit,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / limit),
      },
    };
  }

  async exportReport(
    projectId: string,
    userId: string,
    format: "csv" | "pdf",
  ): Promise<{ content: string; contentType: string; fileName: string }> {
    const summary = await this.getComplianceSummary(projectId, userId);

    if (format === "csv") {
      return this.generateCsvReport(summary);
    }

    return this.generatePdfReport(summary);
  }

  private generateCsvReport(summary: LicenseComplianceSummary) {
    const header = "Dependency,License,Policy,Analysis File";
    const rows = summary.dependencies.map(
      (d) =>
        `"${this.escapeCsv(d.name)}","${this.escapeCsv(d.license ?? "Unknown")}","${d.licensePolicy}","${this.escapeCsv(d.analysisFileName)}"`,
    );

    const summaryRows = [
      "",
      "Summary",
      `Total Dependencies,${summary.total}`,
      `Allowed,${summary.allowed}`,
      `Warned,${summary.warned}`,
      `Blocked,${summary.blocked}`,
      `Unknown License,${summary.unknown}`,
    ];

    const content = [header, ...rows, ...summaryRows].join("\n");

    return {
      content,
      contentType: "text/csv",
      fileName: "license-audit-report.csv",
    };
  }

  private generatePdfReport(summary: LicenseComplianceSummary) {
    const lines = [
      "LICENSE AUDIT REPORT",
      "=".repeat(60),
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      "SUMMARY",
      "-".repeat(40),
      `Total Dependencies: ${summary.total}`,
      `Allowed:            ${summary.allowed}`,
      `Warned:             ${summary.warned}`,
      `Blocked:            ${summary.blocked}`,
      `Unknown License:    ${summary.unknown}`,
      "",
      "DEPENDENCIES",
      "-".repeat(40),
      "",
    ];

    for (const dep of summary.dependencies) {
      lines.push(
        `${dep.name} | ${dep.license ?? "Unknown"} | ${dep.licensePolicy} | ${dep.analysisFileName}`,
      );
    }

    return {
      content: lines.join("\n"),
      contentType: "text/plain",
      fileName: "license-audit-report.txt",
    };
  }

  private escapeCsv(value: string): string {
    return value.replace(/"/g, '""');
  }

  private async requireMember(projectId: string, userId: string): Promise<void> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new NotFoundError("Project not found");
  }

  private async requireEditor(projectId: string, userId: string): Promise<void> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new NotFoundError("Project not found");
    if (member.role === ProjectRole.VIEWER) {
      throw new ForbiddenError("Viewers cannot manage license rules");
    }
  }
}
