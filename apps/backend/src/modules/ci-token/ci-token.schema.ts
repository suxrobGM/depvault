import { t, type Static } from "elysia";
import { PaginatedResponseSchema } from "@/types/response";

export const CreateCiTokenBodySchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  environmentId: t.String({ format: "uuid" }),
  expiresIn: t.Integer({
    minimum: 3600,
    maximum: 31536000,
    description: "Token lifetime in seconds (1h–1y)",
  }),
  ipAllowlist: t.Optional(
    t.Array(t.String({ minLength: 1 }), { description: "IP addresses or CIDR ranges" }),
  ),
});

export const CiTokenResponseSchema = t.Object({
  id: t.String(),
  name: t.String(),
  tokenPrefix: t.String(),
  projectId: t.String(),
  environmentId: t.String(),
  environmentLabel: t.String(),
  ipAllowlist: t.Array(t.String()),
  expiresAt: t.Date(),
  lastUsedAt: t.Nullable(t.Date()),
  revokedAt: t.Nullable(t.Date()),
  createdAt: t.Date(),
  createdByEmail: t.String(),
});

export const CiTokenCreatedResponseSchema = t.Object({
  id: t.String(),
  token: t.String(),
  tokenPrefix: t.String(),
  expiresAt: t.Date(),
});

export const CiTokenListQuerySchema = t.Object({
  page: t.Integer({ minimum: 1, default: 1 }),
  limit: t.Integer({ minimum: 1, maximum: 100, default: 20 }),
});

export const CiTokenListResponseSchema = PaginatedResponseSchema(CiTokenResponseSchema);

export const CiTokenParamsSchema = t.Object({
  id: t.String(),
  tokenId: t.String(),
});

export const CiSecretVariableSchema = t.Object({
  key: t.String(),
  value: t.String(),
});

export const CiSecretFileSchema = t.Object({
  id: t.String(),
  name: t.String(),
  mimeType: t.String(),
  fileSize: t.Number(),
  downloadUrl: t.String(),
});

export const CiSecretsResponseSchema = t.Object({
  variables: t.Array(CiSecretVariableSchema),
  files: t.Array(CiSecretFileSchema),
});

export const CiFileParamsSchema = t.Object({
  fileId: t.String(),
});

export const CiFileQuerySchema = t.Object({
  token: t.String(),
});

export type CreateCiTokenBody = Static<typeof CreateCiTokenBodySchema>;
export type CiTokenResponse = Static<typeof CiTokenResponseSchema>;
export type CiTokenCreatedResponse = Static<typeof CiTokenCreatedResponseSchema>;
export type CiSecretsResponse = Static<typeof CiSecretsResponseSchema>;
