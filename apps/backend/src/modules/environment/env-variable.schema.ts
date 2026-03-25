import { t, type Static } from "elysia";
import { PaginationQuerySchema } from "@/types/pagination";
import { PaginatedResponseSchema } from "@/types/response";
import { EnvironmentTypeSchema } from "./environment.schema";

export const CreateEnvVariableBodySchema = t.Object({
  vaultGroupId: t.String(),
  environmentType: EnvironmentTypeSchema,
  key: t.String({ minLength: 1, maxLength: 255 }),
  encryptedValue: t.String({ minLength: 1 }),
  iv: t.String({ minLength: 1 }),
  authTag: t.String({ minLength: 1 }),
  description: t.Optional(t.String({ maxLength: 500 })),
  isRequired: t.Optional(t.Boolean()),
  sortOrder: t.Optional(t.Number()),
  encryptedComment: t.Optional(t.String()),
  commentIv: t.Optional(t.String()),
  commentAuthTag: t.Optional(t.String()),
});

export const UpdateEnvVariableBodySchema = t.Object({
  key: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  encryptedValue: t.Optional(t.String({ minLength: 1 })),
  iv: t.Optional(t.String({ minLength: 1 })),
  authTag: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String({ maxLength: 500 })),
  isRequired: t.Optional(t.Boolean()),
  sortOrder: t.Optional(t.Number()),
  encryptedComment: t.Optional(t.Nullable(t.String())),
  commentIv: t.Optional(t.Nullable(t.String())),
  commentAuthTag: t.Optional(t.Nullable(t.String())),
});

export const EnvVariableResponseSchema = t.Object({
  id: t.String(),
  environmentId: t.String(),
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

export const EnvVariableWithValueResponseSchema = t.Object({
  id: t.String(),
  environmentId: t.String(),
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

export const EnvVariableListQuerySchema = PaginationQuerySchema(
  t.Object({
    vaultGroupId: t.String(),
    environmentType: t.Optional(EnvironmentTypeSchema),
  }),
);

export const EnvVariableListResponseSchema = PaginatedResponseSchema(
  EnvVariableWithValueResponseSchema,
);

export const EnvVariableParamsSchema = t.Object({
  id: t.String(),
  varId: t.String(),
});

const ImportEntrySchema = t.Object({
  key: t.String({ minLength: 1, maxLength: 255 }),
  encryptedValue: t.String({ minLength: 1 }),
  iv: t.String({ minLength: 1 }),
  authTag: t.String({ minLength: 1 }),
  description: t.Optional(t.String({ maxLength: 500 })),
  isRequired: t.Optional(t.Boolean()),
  sortOrder: t.Optional(t.Number()),
  encryptedComment: t.Optional(t.String()),
  commentIv: t.Optional(t.String()),
  commentAuthTag: t.Optional(t.String()),
});

export const ImportEnvVariablesBodySchema = t.Object({
  vaultGroupId: t.String(),
  environmentType: EnvironmentTypeSchema,
  entries: t.Array(ImportEntrySchema, { minItems: 1 }),
});

export const ImportEnvVariablesResponseSchema = t.Object({
  imported: t.Number(),
  updated: t.Number(),
  variables: t.Array(EnvVariableWithValueResponseSchema),
});

export const ExportEnvVariablesQuerySchema = t.Object({
  vaultGroupId: t.String(),
  environmentType: EnvironmentTypeSchema,
});

const ExportEntrySchema = t.Object({
  key: t.String(),
  encryptedValue: t.String(),
  iv: t.String(),
  authTag: t.String(),
  sortOrder: t.Nullable(t.Number()),
  encryptedComment: t.Nullable(t.String()),
  commentIv: t.Nullable(t.String()),
  commentAuthTag: t.Nullable(t.String()),
});

export const ExportEnvVariablesResponseSchema = t.Object({
  entries: t.Array(ExportEntrySchema),
  environmentType: EnvironmentTypeSchema,
});

export const EnvExampleQuerySchema = t.Object({
  vaultGroupId: t.String(),
  environmentType: EnvironmentTypeSchema,
});

export const EnvExampleResponseSchema = t.Object({
  content: t.String(),
  environmentType: EnvironmentTypeSchema,
});

export const BatchDeleteEnvVariablesBodySchema = t.Object({
  variableIds: t.Array(t.String(), { minItems: 1, maxItems: 100 }),
});

export const BatchDeleteEnvVariablesResponseSchema = t.Object({
  deleted: t.Number(),
});

export type CreateEnvVariableBody = Static<typeof CreateEnvVariableBodySchema>;
export type UpdateEnvVariableBody = Static<typeof UpdateEnvVariableBodySchema>;
export type EnvVariableResponse = Static<typeof EnvVariableResponseSchema>;
export type EnvVariableWithValueResponse = Static<typeof EnvVariableWithValueResponseSchema>;
export type EnvVariableListQuery = Static<typeof EnvVariableListQuerySchema>;
export type ImportEnvVariablesBody = Static<typeof ImportEnvVariablesBodySchema>;
export type ImportEnvVariablesResponse = Static<typeof ImportEnvVariablesResponseSchema>;
export type ExportEnvVariablesQuery = Static<typeof ExportEnvVariablesQuerySchema>;
export type ExportEnvVariablesResponse = Static<typeof ExportEnvVariablesResponseSchema>;
export type EnvExampleResponse = Static<typeof EnvExampleResponseSchema>;
export type BatchDeleteEnvVariablesBody = Static<typeof BatchDeleteEnvVariablesBodySchema>;
