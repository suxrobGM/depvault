import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
import { getClientIp } from "@/common/utils/ip";
import { StringIdParamSchema } from "@/types/request";
import { MessageResponseSchema } from "@/types/response";
import {
  AppListResponseSchema,
  AppParamsSchema,
  AppResponseSchema,
  CreateAppBodySchema,
  ExportBodySchema,
  ExportResponseSchema,
  RepoMapResponseSchema,
  UpdateAppBodySchema,
} from "./app.schema";
import { AppService } from "./app.service";

const appService = container.resolve(AppService);

export const appController = new Elysia({
  prefix: "/projects/:id",
  detail: { tags: ["Apps"], security: [{ bearerAuth: [] }] },
})
  .use(projectGuard("VIEWER"))
  .get("/apps", ({ params }) => appService.list(params.id), {
    params: StringIdParamSchema,
    response: AppListResponseSchema,
    detail: {
      operationId: "listApps",
      summary: "List apps",
      description:
        "List all apps in a project with config/secret file counts and the set of environments present across their files.",
    },
  })
  .get("/apps/:appId", ({ params }) => appService.get(params.id, params.appId), {
    params: AppParamsSchema,
    response: AppResponseSchema,
    detail: {
      operationId: "getApp",
      summary: "Get an app",
      description: "Fetch a single app with its file counts and derived environments.",
    },
  })
  .get("/repo-map", ({ params }) => appService.repoMap(params.id), {
    params: StringIdParamSchema,
    response: RepoMapResponseSchema,
    detail: {
      operationId: "getRepoMap",
      summary: "Get the project repo map",
      description:
        "Return every app in the project with config and secret file metadata. Encrypted file contents are never included — use the export endpoint to retrieve ciphertext.",
    },
  })
  .use(projectGuard("EDITOR"))
  .post("/apps", ({ params, body }) => appService.create(params.id, body), {
    params: StringIdParamSchema,
    body: CreateAppBodySchema,
    response: AppResponseSchema,
    detail: {
      operationId: "createApp",
      summary: "Create an app",
      description:
        "Create a new app within the project. The app path must be unique within the project. Only owners and editors can create apps.",
    },
  })
  .patch("/apps/:appId", ({ params, body }) => appService.update(params.id, params.appId, body), {
    params: AppParamsSchema,
    body: UpdateAppBodySchema,
    response: AppResponseSchema,
    detail: {
      operationId: "updateApp",
      summary: "Update an app",
      description: "Update an app's display name. Only owners and editors can update.",
    },
  })
  .delete("/apps/:appId", ({ params }) => appService.delete(params.id, params.appId), {
    params: AppParamsSchema,
    response: MessageResponseSchema,
    detail: {
      operationId: "deleteApp",
      summary: "Delete an app",
      description:
        "Permanently delete an app and all of its config files, secret files, and version history. Only owners and editors can delete.",
    },
  })
  .post(
    "/export",
    ({ params, body, projectMember, request, server }) =>
      appService.exportFiles(params.id, projectMember.userId, body, getClientIp(request, server)),
    {
      params: StringIdParamSchema,
      body: ExportBodySchema,
      response: ExportResponseSchema,
      detail: {
        operationId: "exportRepoFiles",
        summary: "Export encrypted repo files",
        description:
          "Export client-encrypted config and secret file blobs for a single file, an environment, an app, or the whole repo. Content is returned as ciphertext and decrypted client-side. Only owners and editors can export.",
      },
    },
  );
