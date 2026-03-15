import { singleton } from "tsyringe";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma";
import { BUILT_IN_PATTERNS } from "@/modules/secret-scan/secret-scan.patterns";
import type { CreatePatternBody, PatternResponse, UpdatePatternBody } from "./scan-pattern.schema";

@singleton()
export class ScanPatternService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(projectId: string): Promise<{ items: PatternResponse[] }> {
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

  async create(projectId: string, body: CreatePatternBody): Promise<PatternResponse> {
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
    body: UpdatePatternBody,
  ): Promise<PatternResponse> {
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

  async delete(projectId: string, patternId: string): Promise<{ message: string }> {
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
}
