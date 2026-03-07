import { singleton } from "tsyringe";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma";
import type { PaginatedResponse } from "@/types/response";
import type {
  AnalysisResponse,
  AnalysisSummaryResponse,
  CreateAnalysisBody,
} from "./analysis.schema";
import { nodejsParser, pythonParser, type DependencyParser } from "./parsers";

const PARSERS: Record<string, DependencyParser> = {
  NODEJS: nodejsParser,
  PYTHON: pythonParser,
};

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

    if (!parser.canParse(body.fileName)) {
      throw new BadRequestError(
        `Unsupported file "${body.fileName}" for ${body.ecosystem} ecosystem`,
      );
    }

    const parseResult = parser.parse(body.content, body.fileName);

    const analysis = await this.prisma.analysis.create({
      data: {
        projectId: body.projectId,
        userId,
        fileName: body.fileName,
        ecosystem: body.ecosystem,
        dependencies: {
          create: parseResult.dependencies.map((dep) => ({
            name: dep.name,
            currentVersion: dep.version,
            isDirect: dep.isDirect,
          })),
        },
      },
      include: { dependencies: true },
    });

    return analysis;
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

    const [items, total] = await Promise.all([
      this.prisma.analysis.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.analysis.count({ where }),
    ]);

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
      include: { dependencies: true },
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
}
