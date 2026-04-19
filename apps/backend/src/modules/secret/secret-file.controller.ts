import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
import { rateLimiter } from "@/common/middleware/rate-limiter";
import { getClientIp } from "@/common/utils/ip";
import { StringIdParamSchema } from "@/types/request";
import { MessageResponseSchema } from "@/types/response";
import { SecretFileVersionService } from "./secret-file-version.service";
import {
  SecretFileDownloadResponseSchema,
  SecretFileListQuerySchema,
  SecretFileListResponseSchema,
  SecretFileParamsSchema,
  SecretFileResponseSchema,
  SecretFileRollbackParamsSchema,
  SecretFileVersionListResponseSchema,
  UpdateSecretFileBodySchema,
  UploadNewVersionBodySchema,
  UploadSecretFileBodySchema,
} from "./secret-file.schema";
import { SecretFileService } from "./secret-file.service";

const secretFileService = container.resolve(SecretFileService);
const secretFileVersionService = container.resolve(SecretFileVersionService);

export const secretFileController = new Elysia({
  prefix: "/projects/:id/secrets",
  detail: { tags: ["Secret Files"], security: [{ bearerAuth: [] }] },
})
  .use(projectGuard("VIEWER"))
  .use(rateLimiter({ max: 20, windowMs: 60 * 1000 }))
  .get("/", ({ params, query }) => secretFileService.list(params.id, query.page, query.limit), {
    params: StringIdParamSchema,
    query: SecretFileListQuerySchema,
    response: SecretFileListResponseSchema,
    detail: {
      operationId: "listSecretFiles",
      summary: "List secret files",
      description:
        "List secret file metadata for a project. File contents are not included — use the download endpoint to retrieve decrypted content.",
    },
  })
  .get(
    "/:fileId/versions",
    ({ params }) => secretFileVersionService.listVersions(params.id, params.fileId),
    {
      params: SecretFileParamsSchema,
      response: SecretFileVersionListResponseSchema,
      detail: {
        operationId: "listSecretFileVersions",
        summary: "List secret file versions",
        description:
          "List all version history entries for a secret file. Any project member can view version metadata.",
      },
    },
  )
  .use(projectGuard("EDITOR"))
  .post(
    "/",
    async ({ params, body, projectMember, request, server }) => {
      return secretFileService.upload(
        params.id,
        projectMember.userId,
        body,
        getClientIp(request, server),
      );
    },
    {
      params: StringIdParamSchema,
      body: UploadSecretFileBodySchema,
      response: SecretFileResponseSchema,
      detail: {
        operationId: "uploadSecretFile",
        summary: "Upload a secret file",
        description:
          "Upload a client-encrypted secret file for the project. Executable file types (.exe, .sh, .bat, .cmd, .ps1) are rejected. Max file size is 25 MB. Only owners and editors can upload.",
      },
    },
  )
  .get(
    "/:fileId/download",
    ({ params, projectMember, request, server }) =>
      secretFileService.download(
        params.id,
        params.fileId,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: SecretFileParamsSchema,
      response: SecretFileDownloadResponseSchema,
      detail: {
        operationId: "downloadSecretFile",
        summary: "Download a secret file",
        description:
          "Download an encrypted secret file. Decryption happens client-side. Only owners and editors can download file contents. Viewers can only see metadata via the list endpoint.",
      },
    },
  )
  .put("/:fileId", ({ params, body }) => secretFileService.update(params.id, params.fileId, body), {
    params: SecretFileParamsSchema,
    body: UpdateSecretFileBodySchema,
    response: SecretFileResponseSchema,
    detail: {
      operationId: "updateSecretFile",
      summary: "Update secret file metadata",
      description:
        "Update the name, description, or vault group of a secret file. Only owners and editors can update.",
    },
  })
  .delete(
    "/:fileId",
    ({ params, projectMember, request, server }) =>
      secretFileService.delete(
        params.id,
        params.fileId,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: SecretFileParamsSchema,
      response: MessageResponseSchema,
      detail: {
        operationId: "deleteSecretFile",
        summary: "Delete a secret file",
        description:
          "Permanently delete a secret file and all its version history. Only owners and editors can delete.",
      },
    },
  )
  .post(
    "/:fileId/content",
    async ({ params, body, projectMember, request, server }) =>
      secretFileService.uploadNewVersion(
        params.id,
        params.fileId,
        projectMember.userId,
        body,
        getClientIp(request, server),
      ),
    {
      params: SecretFileParamsSchema,
      body: UploadNewVersionBodySchema,
      response: SecretFileResponseSchema,
      detail: {
        operationId: "uploadSecretFileVersion",
        summary: "Upload a new version of a secret file",
        description:
          "Replace a secret file's content with a new client-encrypted upload. The current content is saved as a version before being replaced. Only owners and editors can upload new versions.",
      },
    },
  )
  .get(
    "/:fileId/versions/:versionId/download",
    ({ params }) =>
      secretFileVersionService.downloadVersion(params.id, params.fileId, params.versionId),
    {
      params: SecretFileRollbackParamsSchema,
      response: SecretFileDownloadResponseSchema,
      detail: {
        operationId: "downloadSecretFileVersion",
        summary: "Download a specific version of a secret file",
        description:
          "Download an encrypted previous version of a secret file. Decryption happens client-side. Only owners and editors can download.",
      },
    },
  )
  .post(
    "/:fileId/rollback/:versionId",
    ({ params, projectMember }) =>
      secretFileVersionService.rollback(
        params.id,
        params.fileId,
        params.versionId,
        projectMember.userId,
      ),
    {
      params: SecretFileRollbackParamsSchema,
      response: SecretFileResponseSchema,
      detail: {
        operationId: "rollbackSecretFile",
        summary: "Rollback to a previous version",
        description:
          "Rollback a secret file to a previous version. The current content is saved as a new version before restoring. Only owners and editors can rollback.",
      },
    },
  );
