import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
import { rateLimiter } from "@/common/middleware/rate-limiter";
import { getClientIp } from "@/common/utils/ip";
import { StringIdParamSchema } from "@/types/request";
import { MessageResponseSchema } from "@/types/response";
import { SecretFileVersionService } from "./secret-file-version.service";
import {
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
  detail: { tags: ["Secret Files"] },
})
  .use(projectGuard("VIEWER"))
  .use(rateLimiter({ max: 20, windowMs: 60 * 1000 }))
  .get(
    "/",
    ({ params, query }) =>
      secretFileService.list(params.id, query.environmentType, query.page, query.limit),
    {
      params: StringIdParamSchema,
      query: SecretFileListQuerySchema,
      response: SecretFileListResponseSchema,
      detail: {
        operationId: "listSecretFiles",
        summary: "List secret files",
        description:
          "List secret file metadata for a project, optionally filtered by environment. File contents are not included — use the download endpoint to retrieve decrypted content.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
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
        security: [{ bearerAuth: [] }],
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
        body.file,
        body.vaultGroupId,
        body.environmentType,
        body.description,
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
          "Upload and encrypt a secret file for the project. Executable file types (.exe, .sh, .bat, .cmd, .ps1) are rejected. Max file size is 25 MB. Only owners and editors can upload.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/:fileId/download",
    async ({ params, projectMember, set, request, server }) => {
      const { buffer, name, mimeType } = await secretFileService.download(
        params.id,
        params.fileId,
        projectMember.userId,
        getClientIp(request, server),
      );
      set.headers["content-type"] = mimeType;
      set.headers["content-disposition"] = `attachment; filename="${name}"`;
      return buffer;
    },
    {
      params: SecretFileParamsSchema,
      detail: {
        operationId: "downloadSecretFile",
        summary: "Download a secret file",
        description:
          "Download and decrypt a secret file. Only owners and editors can download file contents. Viewers can only see metadata via the list endpoint.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .put(
    "/:fileId",
    ({ params, body, projectMember }) => secretFileService.update(params.id, params.fileId, body),
    {
      params: SecretFileParamsSchema,
      body: UpdateSecretFileBodySchema,
      response: SecretFileResponseSchema,
      detail: {
        operationId: "updateSecretFile",
        summary: "Update secret file metadata",
        description:
          "Update the name, description, or environment of a secret file. Only owners and editors can update.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
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
        security: [{ bearerAuth: [] }],
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
        body.file,
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
          "Replace a secret file's content with a new upload. The current content is saved as a version before being replaced. Only owners and editors can upload new versions.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/:fileId/versions/:versionId/download",
    async ({ params, set }) => {
      const { buffer, name, mimeType } = await secretFileVersionService.downloadVersion(
        params.id,
        params.fileId,
        params.versionId,
      );
      set.headers["content-type"] = mimeType;
      set.headers["content-disposition"] = `attachment; filename="${name}"`;
      return buffer;
    },
    {
      params: SecretFileRollbackParamsSchema,
      detail: {
        operationId: "downloadSecretFileVersion",
        summary: "Download a specific version of a secret file",
        description:
          "Download and decrypt a previous version of a secret file. Only owners and editors can download.",
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
      },
    },
  );
