import { t, type Static } from "elysia";
import { DetectionSeverity, DetectionStatus, ScanStatus } from "@/generated/prisma";
import { PaginationQueryBaseSchema, PaginationQuerySchema } from "@/types/pagination";
import { PaginatedResponseSchema } from "@/types/response";

const SeverityEnum = t.Enum(DetectionSeverity);
const StatusEnum = t.Enum(DetectionStatus);
const ScanStatusEnum = t.Enum(ScanStatus);

// --- Params ---

export const ProjectParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
});

export const ScanParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
  scanId: t.String({ format: "uuid" }),
});

export const DetectionParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
  detectionId: t.String({ format: "uuid" }),
});

// --- Scan responses ---

export const ScanResponseSchema = t.Object({
  id: t.String(),
  projectId: t.String(),
  triggeredById: t.String(),
  status: ScanStatusEnum,
  commitsScanned: t.Number(),
  detectionsFound: t.Number(),
  startedAt: t.Nullable(t.Date()),
  completedAt: t.Nullable(t.Date()),
  errorMessage: t.Nullable(t.String()),
  createdAt: t.Date(),
});

export const ScanListQuerySchema = PaginationQueryBaseSchema;

export const ScanListResponseSchema = PaginatedResponseSchema(ScanResponseSchema);

// --- Detection responses ---

export const DetectionResponseSchema = t.Object({
  id: t.String(),
  projectId: t.String(),
  scanId: t.String(),
  commitHash: t.String(),
  filePath: t.String(),
  lineNumber: t.Nullable(t.Number()),
  matchSnippet: t.String(),
  status: StatusEnum,
  resolvedById: t.Nullable(t.String()),
  resolvedAt: t.Nullable(t.Date()),
  remediationSteps: t.Nullable(t.String()),
  createdAt: t.Date(),
  patternName: t.String(),
  patternSeverity: SeverityEnum,
});

export const DetectionListQuerySchema = PaginationQuerySchema(
  t.Object({
    status: t.Optional(StatusEnum),
    severity: t.Optional(SeverityEnum),
  }),
);

export const DetectionListResponseSchema = PaginatedResponseSchema(DetectionResponseSchema);

export const UpdateDetectionBodySchema = t.Object({
  status: t.Union([t.Literal("RESOLVED"), t.Literal("FALSE_POSITIVE")]),
});

export const BatchUpdateDetectionsBodySchema = t.Object({
  detectionIds: t.Array(t.String({ format: "uuid" }), { minItems: 1, maxItems: 500 }),
  status: t.Union([t.Literal("RESOLVED"), t.Literal("FALSE_POSITIVE")]),
});

export const BatchUpdateDetectionsResponseSchema = t.Object({
  updatedCount: t.Number(),
});

// --- Scan summary ---

export const SeverityCountSchema = t.Object({
  critical: t.Number(),
  high: t.Number(),
  medium: t.Number(),
  low: t.Number(),
});

export const ScanSummaryResponseSchema = t.Object({
  lastScan: t.Nullable(ScanResponseSchema),
  openDetections: SeverityCountSchema,
  totalResolved: t.Number(),
});

// --- Types ---

export type ScanResponse = Static<typeof ScanResponseSchema>;
export type DetectionResponse = Static<typeof DetectionResponseSchema>;
export type DetectionListQuery = Static<typeof DetectionListQuerySchema>;
export type UpdateDetectionBody = Static<typeof UpdateDetectionBodySchema>;
export type BatchUpdateDetectionsBody = Static<typeof BatchUpdateDetectionsBodySchema>;
export type BatchUpdateDetectionsResponse = Static<typeof BatchUpdateDetectionsResponseSchema>;
export type ScanSummaryResponse = Static<typeof ScanSummaryResponseSchema>;
