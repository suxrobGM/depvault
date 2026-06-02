import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
import { getClientIp } from "@/common/utils/ip";
import { StringIdParamSchema } from "@/types/request";
import { MessageResponseSchema } from "@/types/response";
import {
  ConfigFileContentResponseSchema,
  ConfigFileListQuerySchema,
  ConfigFileListResponseSchema,
  ConfigFileParamsSchema,
  ConfigFileResponseSchema,
  ConfigFileVersionListResponseSchema,
  ConfigFileVersionParamsSchema,
  PushConfigFileBodySchema,
  SaveConfigFileBodySchema,
} from "./config-file.schema";
import { ConfigFileService } from "./config-file.service";

const configFileService = container.resolve(ConfigFileService);

export const configFileController = new Elysia({
  prefix: "/projects/:id/config-files",
  detail: { tags: ["Config Files"], security: [{ bearerAuth: [] }] },
})
  .use(projectGuard("VIEWER"))
  .get("/", ({ params, query }) => configFileService.list(params.id, query), {
    params: StringIdParamSchema,
    query: ConfigFileListQuerySchema,
    response: ConfigFileListResponseSchema,
    detail: {
      operationId: "listConfigFiles",
      summary: "List config files",
      description:
        "List config file metadata for a project, optionally filtered by app or environment. Encrypted contents are not included — use the get endpoint to retrieve a file's ciphertext.",
    },
  })
  .get("/:fileId", ({ params }) => configFileService.getContent(params.id, params.fileId), {
    params: ConfigFileParamsSchema,
    response: ConfigFileContentResponseSchema,
    detail: {
      operationId: "getConfigFile",
      summary: "Get a config file",
      description:
        "Return a config file's client-encrypted content (base64) plus its crypto params and metadata. Decryption happens client-side; the server never decrypts.",
    },
  })
  .get(
    "/:fileId/versions",
    ({ params }) => configFileService.listVersions(params.id, params.fileId),
    {
      params: ConfigFileParamsSchema,
      response: ConfigFileVersionListResponseSchema,
      detail: {
        operationId: "listConfigFileVersions",
        summary: "List config file versions",
        description:
          "List version history metadata for a config file, newest first. Any project member can view version metadata.",
      },
    },
  )
  .get(
    "/:fileId/versions/:versionId",
    ({ params }) => configFileService.getVersionContent(params.id, params.fileId, params.versionId),
    {
      params: ConfigFileVersionParamsSchema,
      response: ConfigFileContentResponseSchema,
      detail: {
        operationId: "getConfigFileVersion",
        summary: "Get a config file version",
        description:
          "Return the client-encrypted content of a specific config file version, for diffing or restoring. Decryption happens client-side.",
      },
    },
  )
  .use(projectGuard("EDITOR"))
  .post(
    "/push",
    ({ params, body, projectMember, request, server }) =>
      configFileService.push(params.id, projectMember.userId, body, getClientIp(request, server)),
    {
      params: StringIdParamSchema,
      body: PushConfigFileBodySchema,
      response: ConfigFileResponseSchema,
      detail: {
        operationId: "pushConfigFile",
        summary: "Push a config file",
        description:
          "Push a client-encrypted config file from the CLI. Upserts the owning app by path, then creates the file or replaces an existing one (saving the prior content as a version). Only owners and editors can push.",
      },
    },
  )
  .put(
    "/:fileId",
    ({ params, body, projectMember, request, server }) =>
      configFileService.webSave(
        params.id,
        params.fileId,
        projectMember.userId,
        body,
        getClientIp(request, server),
      ),
    {
      params: ConfigFileParamsSchema,
      body: SaveConfigFileBodySchema,
      response: ConfigFileResponseSchema,
      detail: {
        operationId: "saveConfigFile",
        summary: "Save a config file",
        description:
          "Replace a config file's content with a new client-encrypted blob from the web editor. The current content is saved as a version before being replaced. Only owners and editors can save.",
      },
    },
  )
  .delete(
    "/:fileId",
    ({ params, projectMember, request, server }) =>
      configFileService.delete(
        params.id,
        params.fileId,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: ConfigFileParamsSchema,
      response: MessageResponseSchema,
      detail: {
        operationId: "deleteConfigFile",
        summary: "Delete a config file",
        description:
          "Permanently delete a config file and all of its version history. Only owners and editors can delete.",
      },
    },
  )
  .post(
    "/:fileId/versions/:versionId/restore",
    ({ params, projectMember, request, server }) =>
      configFileService.restoreVersion(
        params.id,
        params.fileId,
        params.versionId,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: ConfigFileVersionParamsSchema,
      response: ConfigFileResponseSchema,
      detail: {
        operationId: "restoreConfigFileVersion",
        summary: "Restore a config file version",
        description:
          "Restore a config file to a previous version. The current content is saved as a new version before restoring. Only owners and editors can restore.",
      },
    },
  );
