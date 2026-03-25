import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
import { getClientIp } from "@/common/utils/ip";
import { StringIdParamSchema } from "@/types/request";
import { MessageResponseSchema } from "@/types/response";
import { ciTokenGuard } from "./ci-token.middleware";
import {
  CiFileDownloadResponseSchema,
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

/** Read-only CI token endpoints (VIEWER+). */
const ciTokenReadController = new Elysia({
  prefix: "/projects/:id/ci-tokens",
  detail: { tags: ["CI/CD Tokens"] },
})
  .use(projectGuard("VIEWER"))
  .get("/", ({ params, query }) => ciTokenService.list(params.id, query.page, query.limit), {
    params: StringIdParamSchema,
    query: CiTokenListQuerySchema,
    response: CiTokenListResponseSchema,
    detail: {
      operationId: "listCiTokens",
      summary: "List CI tokens",
      description: "List all CI/CD tokens for a project.",
      security: [{ bearerAuth: [] }],
    },
  });

/** Write CI token endpoints (EDITOR+). */
const ciTokenWriteController = new Elysia({
  prefix: "/projects/:id/ci-tokens",
  detail: { tags: ["CI/CD Tokens"] },
})
  .use(projectGuard("EDITOR"))
  .post(
    "/",
    ({ params, body, projectMember, request, server }) =>
      ciTokenService.create(params.id, projectMember.userId, body, getClientIp(request, server)),
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
  .delete(
    "/:tokenId",
    ({ params, projectMember, request, server }) =>
      ciTokenService.revoke(
        params.id,
        params.tokenId,
        projectMember.userId,
        getClientIp(request, server),
      ),
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

/** Management endpoints for CI/CD tokens (JWT-authenticated). */
export const ciTokenController = new Elysia()
  .use(ciTokenReadController)
  .use(ciTokenWriteController);

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
    ({ ciToken, params }) => ciTokenService.downloadFile(ciToken, params.fileId),
    {
      params: CiFileParamsSchema,
      query: CiFileQuerySchema,
      response: CiFileDownloadResponseSchema,
      detail: {
        operationId: "downloadCiSecretFile",
        summary: "Download encrypted secret file",
        description:
          "Download an encrypted secret file using a CI token. Decryption happens client-side using the wrapped DEK.",
      },
    },
  );
