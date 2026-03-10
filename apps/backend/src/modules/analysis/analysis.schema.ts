import { t, type Static } from "elysia";
import { Ecosystem } from "@/generated/prisma";

const EcosystemEnum = t.Enum(Ecosystem);

export const CreateAnalysisBodySchema = t.Object({
  projectId: t.String({ format: "uuid" }),
  fileName: t.String({ minLength: 1, maxLength: 255 }),
  filePath: t.Optional(t.String({ maxLength: 1024 })),
  content: t.String({ minLength: 1 }),
  ecosystem: EcosystemEnum,
});

export const VulnerabilityResponseSchema = t.Object({
  id: t.String(),
  cveId: t.Nullable(t.String()),
  title: t.String(),
  description: t.Nullable(t.String()),
  severity: t.String(),
  fixedIn: t.Nullable(t.String()),
  url: t.Nullable(t.String()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

export const DependencyResponseSchema = t.Object({
  id: t.String(),
  name: t.String(),
  currentVersion: t.String(),
  latestVersion: t.Nullable(t.String()),
  status: t.String(),
  license: t.Nullable(t.String()),
  licensePolicy: t.String(),
  isDirect: t.Boolean(),
  parentId: t.Nullable(t.String()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
  vulnerabilities: t.Array(VulnerabilityResponseSchema),
});

export const AnalysisResponseSchema = t.Object({
  id: t.String(),
  projectId: t.String(),
  userId: t.String(),
  fileName: t.String(),
  filePath: t.Nullable(t.String()),
  ecosystem: EcosystemEnum,
  healthScore: t.Nullable(t.Number()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
  dependencies: t.Array(DependencyResponseSchema),
});

export const AnalysisSummaryResponseSchema = t.Object({
  id: t.String(),
  projectId: t.String(),
  userId: t.String(),
  fileName: t.String(),
  filePath: t.Nullable(t.String()),
  ecosystem: EcosystemEnum,
  healthScore: t.Nullable(t.Number()),
  dependencyCount: t.Number(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

export const AnalysisListQuerySchema = t.Object({
  page: t.Integer({ minimum: 1, default: 1 }),
  limit: t.Integer({ minimum: 1, maximum: 100, default: 20 }),
});

export const AnalysisListResponseSchema = t.Object({
  items: t.Array(AnalysisSummaryResponseSchema),
  pagination: t.Object({
    page: t.Number(),
    limit: t.Number(),
    total: t.Number(),
    totalPages: t.Number(),
  }),
});

export const AnalysisProjectParamsSchema = t.Object({
  projectId: t.String({ format: "uuid" }),
});

export const AnalysisParamsSchema = t.Object({
  projectId: t.String({ format: "uuid" }),
  analysisId: t.String({ format: "uuid" }),
});

export type CreateAnalysisBody = Static<typeof CreateAnalysisBodySchema>;
export type AnalysisResponse = Static<typeof AnalysisResponseSchema>;
export type AnalysisSummaryResponse = Static<typeof AnalysisSummaryResponseSchema>;
export type AnalysisListQuery = Static<typeof AnalysisListQuerySchema>;
