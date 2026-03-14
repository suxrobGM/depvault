import { t, type Static } from "elysia";
import { Ecosystem } from "@/generated/prisma";
import { PaginationQueryBaseSchema } from "@/types/pagination";
import { PaginatedResponseSchema } from "@/types/response";
import { tDateTime, tStringEnum } from "@/types/schema";

const EcosystemEnum = tStringEnum(Ecosystem);

export const CreateAnalysisBodySchema = t.Object({
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
  createdAt: tDateTime(),
  updatedAt: tDateTime(),
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
  createdAt: tDateTime(),
  updatedAt: tDateTime(),
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
  createdAt: tDateTime(),
  updatedAt: tDateTime(),
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
  createdAt: tDateTime(),
  updatedAt: tDateTime(),
});

export const AnalysisListQuerySchema = PaginationQueryBaseSchema;

export const AnalysisListResponseSchema = PaginatedResponseSchema(AnalysisSummaryResponseSchema);

export const AnalysisProjectParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
});

export const AnalysisItemParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
  analysisId: t.String({ format: "uuid" }),
});

export const UpdateAnalysisBodySchema = t.Object({
  filePath: t.Optional(t.Nullable(t.String({ maxLength: 1024 }))),
});

export type CreateAnalysisBody = Static<typeof CreateAnalysisBodySchema>;
export type UpdateAnalysisBody = Static<typeof UpdateAnalysisBodySchema>;
export type AnalysisResponse = Static<typeof AnalysisResponseSchema>;
export type AnalysisSummaryResponse = Static<typeof AnalysisSummaryResponseSchema>;
export type AnalysisListQuery = Static<typeof AnalysisListQuerySchema>;
