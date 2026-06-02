import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
import { getClientIp } from "@/common/utils/ip";
import { StringIdParamSchema } from "@/types/request";
import { MessageResponseSchema } from "@/types/response";
import {
  PushRepoFileBodySchema,
  RepoFileContentResponseSchema,
  RepoFileListQuerySchema,
  RepoFileListResponseSchema,
  RepoFileParamsSchema,
  RepoFileResponseSchema,
  RepoFileVersionListResponseSchema,
  RepoFileVersionParamsSchema,
  SaveRepoFileBodySchema,
  UpdateRepoFileBodySchema,
} from "./repo-file.schema";
import { RepoFileService } from "./repo-file.service";

const repoFileService = container.resolve(RepoFileService);

export const repoFileController = new Elysia({
  prefix: "/projects/:id/files",
  detail: { tags: ["Files"], security: [{ bearerAuth: [] }] },
})
  .use(projectGuard("VIEWER"))
  .get("/", ({ params, query }) => repoFileService.list(params.id, query), {
    params: StringIdParamSchema,
    query: RepoFileListQuerySchema,
    response: RepoFileListResponseSchema,
    detail: {
      operationId: "listRepoFiles",
      summary: "List repo files",
      description:
        "List file metadata for a project, optionally filtered by app, environment, or kind (CONFIG/SECRET). Encrypted contents are not included — use the get endpoint to retrieve a file's ciphertext.",
    },
  })
  .get(
    "/:fileId",
    ({ params, projectMember, request, server }) =>
      repoFileService.getContent(
        params.id,
        params.fileId,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: RepoFileParamsSchema,
      response: RepoFileContentResponseSchema,
      detail: {
        operationId: "getRepoFile",
        summary: "Get a repo file",
        description:
          "Return a file's client-encrypted content (base64) plus its crypto params and metadata. Decryption happens client-side; the server never decrypts.",
      },
    },
  )
  .get(
    "/:fileId/versions",
    ({ params }) => repoFileService.listVersions(params.id, params.fileId),
    {
      params: RepoFileParamsSchema,
      response: RepoFileVersionListResponseSchema,
      detail: {
        operationId: "listRepoFileVersions",
        summary: "List repo file versions",
        description:
          "List version history metadata for a file, newest first. Any project member can view version metadata.",
      },
    },
  )
  .get(
    "/:fileId/versions/:versionId",
    ({ params }) => repoFileService.getVersionContent(params.id, params.fileId, params.versionId),
    {
      params: RepoFileVersionParamsSchema,
      response: RepoFileContentResponseSchema,
      detail: {
        operationId: "getRepoFileVersion",
        summary: "Get a repo file version",
        description:
          "Return the client-encrypted content of a specific file version, for diffing or restoring. Decryption happens client-side.",
      },
    },
  )
  .use(projectGuard("EDITOR"))
  .post(
    "/push",
    ({ params, body, projectMember, request, server }) =>
      repoFileService.push(params.id, projectMember.userId, body, getClientIp(request, server)),
    {
      params: StringIdParamSchema,
      body: PushRepoFileBodySchema,
      response: RepoFileResponseSchema,
      detail: {
        operationId: "pushRepoFile",
        summary: "Push a repo file",
        description:
          "Push a client-encrypted file from the CLI. Upserts the owning app by path, then creates the file or replaces an existing one (saving the prior content as a version). `kind` is CONFIG or SECRET. Executable file types (.exe, .sh, .bat, .cmd, .ps1) are rejected. Only owners and editors can push.",
      },
    },
  )
  .put(
    "/:fileId",
    ({ params, body, projectMember, request, server }) =>
      repoFileService.webSave(
        params.id,
        params.fileId,
        projectMember.userId,
        body,
        getClientIp(request, server),
      ),
    {
      params: RepoFileParamsSchema,
      body: SaveRepoFileBodySchema,
      response: RepoFileResponseSchema,
      detail: {
        operationId: "saveRepoFile",
        summary: "Save a repo file",
        description:
          "Replace a file's content with a new client-encrypted blob from the web editor. The current content is saved as a version before being replaced. Only owners and editors can save.",
      },
    },
  )
  .patch("/:fileId", ({ params, body }) => repoFileService.update(params.id, params.fileId, body), {
    params: RepoFileParamsSchema,
    body: UpdateRepoFileBodySchema,
    response: RepoFileResponseSchema,
    detail: {
      operationId: "updateRepoFile",
      summary: "Update repo file metadata",
      description:
        "Update the description or environment of a file. The file's app and path cannot be changed — re-push to a new path instead. Only owners and editors can update.",
    },
  })
  .delete(
    "/:fileId",
    ({ params, projectMember, request, server }) =>
      repoFileService.delete(
        params.id,
        params.fileId,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: RepoFileParamsSchema,
      response: MessageResponseSchema,
      detail: {
        operationId: "deleteRepoFile",
        summary: "Delete a repo file",
        description:
          "Permanently delete a file and all of its version history. Only owners and editors can delete.",
      },
    },
  )
  .post(
    "/:fileId/versions/:versionId/restore",
    ({ params, projectMember, request, server }) =>
      repoFileService.restoreVersion(
        params.id,
        params.fileId,
        params.versionId,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: RepoFileVersionParamsSchema,
      response: RepoFileResponseSchema,
      detail: {
        operationId: "restoreRepoFileVersion",
        summary: "Restore a repo file version",
        description:
          "Restore a file to a previous version. The current content is saved as a new version before restoring. Only owners and editors can restore.",
      },
    },
  );
