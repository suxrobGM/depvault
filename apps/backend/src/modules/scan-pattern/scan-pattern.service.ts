import { singleton } from "tsyringe";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/common/errors";
import { PrismaClient, ProjectRole } from "@/generated/prisma";
import { BUILT_IN_PATTERNS } from "@/modules/secret-scan/secret-scan.patterns";
import type { CreatePatternBody, PatternResponse, UpdatePatternBody } from "./scan-pattern.schema";

@singleton()
export class ScanPatternService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(projectId: string, userId: string): Promise<{ items: PatternResponse[] }> {
    await this.requireMember(projectId, userId);

    const customPatterns = await this.prisma.scanPattern.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    const builtIn: PatternResponse[] = BUILT_IN_PATTERNS.map((p, i) => ({
      id: `builtin-${i}`,
      projectId: null,
      name: p.name,
      regex: p.regex,
      severity: p.severity,
      isBuiltIn: true,
      createdAt: new Date(0),
    }));

    const custom: PatternResponse[] = customPatterns.map((p) => ({
      id: p.id,
      projectId: p.projectId,
      name: p.name,
      regex: p.regex,
      severity: p.severity,
      isBuiltIn: p.isBuiltIn,
      createdAt: p.createdAt,
    }));

    return { items: [...builtIn, ...custom] };
  }

  async create(
    projectId: string,
    userId: string,
    body: CreatePatternBody,
  ): Promise<PatternResponse> {
    await this.requireEditor(projectId, userId);
    this.validateRegex(body.regex);

    const pattern = await this.prisma.scanPattern.create({
      data: {
        projectId,
        name: body.name,
        regex: body.regex,
        severity: body.severity,
        isBuiltIn: false,
      },
    });

    return {
      id: pattern.id,
      projectId: pattern.projectId,
      name: pattern.name,
      regex: pattern.regex,
      severity: pattern.severity,
      isBuiltIn: pattern.isBuiltIn,
      createdAt: pattern.createdAt,
    };
  }

  async update(
    projectId: string,
    patternId: string,
    userId: string,
    body: UpdatePatternBody,
  ): Promise<PatternResponse> {
    await this.requireEditor(projectId, userId);

    const pattern = await this.prisma.scanPattern.findFirst({
      where: { id: patternId, projectId },
    });

    if (!pattern) throw new NotFoundError("Pattern not found");
    if (pattern.isBuiltIn) throw new ForbiddenError("Cannot modify built-in patterns");

    if (body.regex) this.validateRegex(body.regex);

    const updated = await this.prisma.scanPattern.update({
      where: { id: patternId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.regex !== undefined && { regex: body.regex }),
        ...(body.severity !== undefined && { severity: body.severity }),
      },
    });

    return {
      id: updated.id,
      projectId: updated.projectId,
      name: updated.name,
      regex: updated.regex,
      severity: updated.severity,
      isBuiltIn: updated.isBuiltIn,
      createdAt: updated.createdAt,
    };
  }

  async delete(projectId: string, patternId: string, userId: string): Promise<{ message: string }> {
    await this.requireEditor(projectId, userId);

    const pattern = await this.prisma.scanPattern.findFirst({
      where: { id: patternId, projectId },
    });

    if (!pattern) throw new NotFoundError("Pattern not found");
    if (pattern.isBuiltIn) throw new ForbiddenError("Cannot delete built-in patterns");

    await this.prisma.scanPattern.delete({ where: { id: patternId } });

    return { message: "Pattern deleted successfully" };
  }

  private validateRegex(regex: string): void {
    try {
      new RegExp(regex);
    } catch {
      throw new BadRequestError("Invalid regular expression");
    }
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
      throw new ForbiddenError("Viewers cannot manage patterns");
    }
  }
}
