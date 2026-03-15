import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import {
  BatchUpdateDetectionsBodySchema,
  BatchUpdateDetectionsResponseSchema,
  DetectionListQuerySchema,
  DetectionListResponseSchema,
  DetectionParamsSchema,
  DetectionResponseSchema,
  ProjectParamsSchema,
  ScanListQuerySchema,
  ScanListResponseSchema,
  ScanParamsSchema,
  ScanResponseSchema,
  ScanSummaryResponseSchema,
  UpdateDetectionBodySchema,
} from "./secret-scan.schema";
import { SecretScanService } from "./secret-scan.service";

const secretScanService = container.resolve(SecretScanService);

export const secretScanController = new Elysia({
  prefix: "/projects/:id",
  detail: { tags: ["Secret Scanning"] },
})
  .use(authGuard)
  .post("/scans", ({ params, user }) => secretScanService.triggerScan(params.id, user.id), {
    params: ProjectParamsSchema,
    response: ScanResponseSchema,
    detail: {
      operationId: "triggerSecretScan",
      summary: "Trigger secret scan",
      description:
        "Start a new secret scan for the project's connected GitHub repository. Requires editor or owner role.",
      security: [{ bearerAuth: [] }],
    },
  })
  .get(
    "/scans",
    ({ params, query, user }) =>
      secretScanService.listScans(params.id, user.id, query.page, query.limit),
    {
      params: ProjectParamsSchema,
      query: ScanListQuerySchema,
      response: ScanListResponseSchema,
      detail: {
        operationId: "listSecretScans",
        summary: "List secret scans",
        description: "Return a paginated list of secret scans for the project.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/scans/:scanId",
    ({ params, user }) => secretScanService.getScan(params.id, params.scanId, user.id),
    {
      params: ScanParamsSchema,
      response: ScanResponseSchema,
      detail: {
        operationId: "getSecretScan",
        summary: "Get scan details",
        description: "Return details for a specific secret scan.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/detections",
    ({ params, query, user }) => secretScanService.listDetections(params.id, user.id, query),
    {
      params: ProjectParamsSchema,
      query: DetectionListQuerySchema,
      response: DetectionListResponseSchema,
      detail: {
        operationId: "listSecretDetections",
        summary: "List secret detections",
        description:
          "Return a paginated list of secret detections with optional status and severity filters.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .patch(
    "/detections/:detectionId",
    ({ params, body, user }) =>
      secretScanService.updateDetectionStatus(params.id, params.detectionId, body, user.id),
    {
      params: DetectionParamsSchema,
      body: UpdateDetectionBodySchema,
      response: DetectionResponseSchema,
      detail: {
        operationId: "updateDetectionStatus",
        summary: "Update detection status",
        description:
          "Mark a detection as resolved or false positive. Requires editor or owner role.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .patch(
    "/detections",
    ({ params, body, user }) => secretScanService.batchUpdateDetections(params.id, body, user.id),
    {
      params: ProjectParamsSchema,
      body: BatchUpdateDetectionsBodySchema,
      response: BatchUpdateDetectionsResponseSchema,
      detail: {
        operationId: "batchUpdateDetections",
        summary: "Batch update detection statuses",
        description:
          "Mark multiple detections as resolved or false positive in one request. Only updates OPEN detections. Requires editor or owner role.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/scan-summary",
    ({ params, user }) => secretScanService.getScanSummary(params.id, user.id),
    {
      params: ProjectParamsSchema,
      response: ScanSummaryResponseSchema,
      detail: {
        operationId: "getSecretScanSummary",
        summary: "Get scan summary",
        description:
          "Return scan summary including last scan info, open detections by severity, and resolved count.",
        security: [{ bearerAuth: [] }],
      },
    },
  );
