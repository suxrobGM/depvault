import { t, type Static } from "elysia";
import { PaginationQuerySchema } from "@/types/pagination";
import { PaginatedResponseSchema } from "@/types/response";

export const CreateEnvVariableBodySchema = t.Object({
  key: t.String({ minLength: 1, maxLength: 255 }),
  // An empty string is allowed — represents a "blank" required variable carried from a cloned vault.
  encryptedValue: t.String(),
  iv: t.String(),
  authTag: t.String(),
  description: t.Optional(t.String({ maxLength: 500 })),
  isRequired: t.Optional(t.Boolean()),
  sortOrder: t.Optional(t.Number()),
  encryptedComment: t.Optional(t.String()),
  commentIv: t.Optional(t.String()),
  commentAuthTag: t.Optional(t.String()),
});

export const UpdateEnvVariableBodySchema = t.Object({
  key: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  encryptedValue: t.Optional(t.String()),
  iv: t.Optional(t.String()),
  authTag: t.Optional(t.String()),
  description: t.Optional(t.String({ maxLength: 500 })),
  isRequired: t.Optional(t.Boolean()),
  sortOrder: t.Optional(t.Number()),
  encryptedComment: t.Optional(t.Nullable(t.String())),
  commentIv: t.Optional(t.Nullable(t.String())),
  commentAuthTag: t.Optional(t.Nullable(t.String())),
});

export const EnvVariableWithValueResponseSchema = t.Object({
  id: t.String(),
  vaultId: t.String(),
  key: t.String(),
  encryptedValue: t.String(),
  iv: t.String(),
  authTag: t.String(),
  sortOrder: t.Nullable(t.Number()),
  encryptedComment: t.Nullable(t.String()),
  commentIv: t.Nullable(t.String()),
  commentAuthTag: t.Nullable(t.String()),
  description: t.Nullable(t.String()),
  isRequired: t.Boolean(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

export const EnvVariableListQuerySchema = PaginationQuerySchema(t.Object({}));

export const EnvVariableListResponseSchema = PaginatedResponseSchema(
  EnvVariableWithValueResponseSchema,
);

export const EnvVariableParamsSchema = t.Object({
  id: t.String(),
  vaultId: t.String(),
  varId: t.String(),
});

export const EnvVariableVaultParamsSchema = t.Object({
  id: t.String(),
  vaultId: t.String(),
});

export const BatchDeleteEnvVariablesBodySchema = t.Object({
  variableIds: t.Array(t.String(), { minItems: 1, maxItems: 100 }),
});

export const BatchDeleteEnvVariablesResponseSchema = t.Object({
  deleted: t.Number(),
});

export type CreateEnvVariableBody = Static<typeof CreateEnvVariableBodySchema>;
export type UpdateEnvVariableBody = Static<typeof UpdateEnvVariableBodySchema>;
export type EnvVariableWithValueResponse = Static<typeof EnvVariableWithValueResponseSchema>;
export type BatchDeleteEnvVariablesBody = Static<typeof BatchDeleteEnvVariablesBodySchema>;
