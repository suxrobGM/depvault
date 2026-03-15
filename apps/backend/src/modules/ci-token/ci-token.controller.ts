import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import { getClientIp } from "@/common/utils/ip";
import { StringIdParamSchema } from "@/types/request";
import { MessageResponseSchema } from "@/types/response";
import { ciTokenGuard } from "./ci-token.middleware";
import {
  CiFileParamsSchema,
  CiFileQuerySchema,
  CiSecretsResponseSchema,
  CiTokenCreatedResponseSchema,
  CiTokenListQuerySchema,
  CiTokenListResponseSchema,
  CiTokenParamsSchema,
  CreateCiTokenBodySchema,
} from "./ci-token.schema";
import { CiTokenService } from "./ci-token.service";

const ciTokenService = container.resolve(CiTokenService);

/** Management endpoints for CI/CD tokens (JWT-authenticated). */
export const ciTokenController = new Elysia({
  prefix: "/projects/:id/ci-tokens",
  detail: { tags: ["CI/CD Tokens"] },
})
  .use(authGuard)
  .post(
    "/",
    ({ params, body, user, request, server }) =>
      ciTokenService.create(params.id, user.id, body, getClientIp(request, server)),
    {
      params: StringIdParamSchema,
      body: CreateCiTokenBodySchema,
      response: CiTokenCreatedResponseSchema,
      detail: {
        operationId: "createCiToken",
        summary: "Create CI token",
        description: "Generate a scoped CI/CD token bound to a specific environment.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/",
    ({ params, query, user }) => ciTokenService.list(params.id, user.id, query.page, query.limit),
    {
      params: StringIdParamSchema,
      query: CiTokenListQuerySchema,
      response: CiTokenListResponseSchema,
      detail: {
        operationId: "listCiTokens",
        summary: "List CI tokens",
        description: "List all CI/CD tokens for a project.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete(
    "/:tokenId",
    ({ params, user, request, server }) =>
      ciTokenService.revoke(params.id, params.tokenId, user.id, getClientIp(request, server)),
    {
      params: CiTokenParamsSchema,
      response: MessageResponseSchema,
      detail: {
        operationId: "revokeCiToken",
        summary: "Revoke CI token",
        description: "Immediately revoke a CI/CD token.",
        security: [{ bearerAuth: [] }],
      },
    },
  );

/** CI/CD access endpoints (CI token authenticated). */
export const ciAccessController = new Elysia({
  prefix: "/ci/secrets",
  detail: { tags: ["CI/CD Access"] },
})
  .use(ciTokenGuard)
  .get(
    "/",
    ({ ciToken, rawToken, clientIp, headers, request }) => {
      const pipelineRunId = headers["x-pipeline-run-id"] ?? null;
      const baseUrl = new URL(request.url).origin;
      return ciTokenService.fetchSecrets(ciToken, rawToken, pipelineRunId, clientIp, baseUrl);
    },
    {
      response: CiSecretsResponseSchema,
      detail: {
        operationId: "fetchCiSecrets",
        summary: "Fetch secrets",
        description:
          "Fetch all environment variables and secret file metadata for the token's bound environment.",
      },
    },
  )
  .get(
    "/files/:fileId",
    async ({ ciToken, params, set }) => {
      const { buffer, name, mimeType } = await ciTokenService.downloadFile(ciToken, params.fileId);
      set.headers["Content-Type"] = mimeType;
      set.headers["Content-Disposition"] = `attachment; filename="${name}"`;
      return buffer;
    },
    {
      params: CiFileParamsSchema,
      query: CiFileQuerySchema,
      detail: {
        operationId: "downloadCiSecretFile",
        summary: "Download secret file",
        description: "Download a specific secret file using a CI token.",
      },
    },
  );
