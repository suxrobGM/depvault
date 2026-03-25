import { t, type Static } from "elysia";

export const CreateEnvShareBodySchema = t.Object({
  encryptedPayload: t.String({ description: "Client-encrypted payload" }),
  iv: t.String(),
  authTag: t.String(),
  variableIds: t.Optional(t.Array(t.String(), { maxItems: 100, description: "For audit trail" })),
  expiresIn: t.Integer({ minimum: 3600, maximum: 2592000 }),
  password: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
});

export const CreateFileShareBodySchema = t.Object({
  encryptedPayload: t.String({ description: "Client-encrypted payload" }),
  iv: t.String(),
  authTag: t.String(),
  fileName: t.String(),
  mimeType: t.String(),
  expiresIn: t.Integer({ minimum: 3600, maximum: 2592000 }),
  password: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
});

export const AccessSecretBodySchema = t.Object({
  password: t.Optional(t.String()),
});

export const SharedSecretInfoResponseSchema = t.Object({
  payloadType: t.UnionEnum(["ENV_VARIABLES", "SECRET_FILE"] as const),
  hasPassword: t.Boolean(),
  fileName: t.Nullable(t.String()),
  mimeType: t.Nullable(t.String()),
  expiresAt: t.Date(),
});

export const AccessSecretResponseSchema = t.Object({
  encryptedPayload: t.String(),
  iv: t.String(),
  authTag: t.String(),
  payloadType: t.UnionEnum(["ENV_VARIABLES", "SECRET_FILE"] as const),
  fileName: t.Nullable(t.String()),
  mimeType: t.Nullable(t.String()),
});

export const CreateShareResponseSchema = t.Object({
  token: t.String(),
  shareUrl: t.String(),
});

export const SharedSecretAuditItemSchema = t.Object({
  id: t.String(),
  token: t.String(),
  payloadType: t.UnionEnum(["ENV_VARIABLES", "SECRET_FILE"] as const),
  status: t.UnionEnum(["PENDING", "VIEWED", "EXPIRED"] as const),
  hasPassword: t.Boolean(),
  fileName: t.Nullable(t.String()),
  expiresAt: t.Date(),
  viewedAt: t.Nullable(t.Date()),
  createdAt: t.Date(),
});

export const SharedSecretAuditListResponseSchema = t.Object({
  items: t.Array(SharedSecretAuditItemSchema),
});

export const SharedSecretParamsSchema = t.Object({
  id: t.String(),
  secretId: t.String(),
});

export const SharedSecretFileParamsSchema = t.Object({
  id: t.String(),
  fileId: t.String(),
});

export const TokenParamSchema = t.Object({ token: t.String() });

export type CreateEnvShareBody = Static<typeof CreateEnvShareBodySchema>;
export type CreateFileShareBody = Static<typeof CreateFileShareBodySchema>;
export type AccessSecretBody = Static<typeof AccessSecretBodySchema>;
export type SharedSecretInfoResponse = Static<typeof SharedSecretInfoResponseSchema>;
export type CreateShareResponse = Static<typeof CreateShareResponseSchema>;
export type SharedSecretAuditItem = Static<typeof SharedSecretAuditItemSchema>;
export type AccessSecretResponse = Static<typeof AccessSecretResponseSchema>;
