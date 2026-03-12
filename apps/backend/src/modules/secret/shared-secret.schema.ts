import { t, type Static } from "elysia";

export const CreateEnvShareBodySchema = t.Object({
  variableIds: t.Array(t.String(), { minItems: 1, maxItems: 100 }),
  expiresIn: t.Integer({ minimum: 3600, maximum: 2592000 }), // 1 hour to 30 days in seconds
  password: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
});

export const CreateFileShareBodySchema = t.Object({
  expiresIn: t.Integer({ minimum: 3600, maximum: 2592000 }),
  password: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
});

export const AccessSecretBodySchema = t.Object({
  password: t.Optional(t.String()),
});

export const SharedSecretInfoResponseSchema = t.Object({
  payloadType: t.Union([t.Literal("ENV_VARIABLES"), t.Literal("SECRET_FILE")]),
  hasPassword: t.Boolean(),
  fileName: t.Nullable(t.String()),
  mimeType: t.Nullable(t.String()),
  expiresAt: t.Date(),
});

export const SharedSecretVariableSchema = t.Object({
  key: t.String(),
  value: t.String(),
});

export const AccessEnvSecretResponseSchema = t.Object({
  payloadType: t.Literal("ENV_VARIABLES"),
  variables: t.Array(SharedSecretVariableSchema),
});

export const AccessFileSecretResponseSchema = t.Object({
  payloadType: t.Literal("SECRET_FILE"),
  fileName: t.String(),
  mimeType: t.String(),
  content: t.String(), // base64-encoded file content
});

export const CreateShareResponseSchema = t.Object({
  token: t.String(),
  shareUrl: t.String(),
});

export const SharedSecretAuditItemSchema = t.Object({
  id: t.String(),
  token: t.String(),
  payloadType: t.Union([t.Literal("ENV_VARIABLES"), t.Literal("SECRET_FILE")]),
  status: t.Union([t.Literal("PENDING"), t.Literal("VIEWED"), t.Literal("EXPIRED")]),
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
export type SharedSecretAuditItem = Static<typeof SharedSecretAuditItemSchema>;
export type AccessEnvSecretResponse = Static<typeof AccessEnvSecretResponseSchema>;
export type AccessFileSecretResponse = Static<typeof AccessFileSecretResponseSchema>;
