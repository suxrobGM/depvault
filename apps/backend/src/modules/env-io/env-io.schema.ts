import { t, type Static } from "elysia";
import { EnvironmentTypeSchema, EnvVariableWithValueResponseSchema } from "@/modules/environment";

const ImportEntrySchema = t.Object({
  key: t.String({ minLength: 1, maxLength: 255 }),
  encryptedValue: t.String(),
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

export type ImportEnvVariablesBody = Static<typeof ImportEnvVariablesBodySchema>;
export type ImportEnvVariablesResponse = Static<typeof ImportEnvVariablesResponseSchema>;
export type ExportEnvVariablesResponse = Static<typeof ExportEnvVariablesResponseSchema>;
export type EnvExampleResponse = Static<typeof EnvExampleResponseSchema>;
