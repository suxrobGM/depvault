import { t, type Static } from "elysia";
import { EnvVariableWithValueResponseSchema } from "@/modules/env-variable";

const ImportEntrySchema = t.Object({
  key: t.String({ minLength: 1, maxLength: 255 }),
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

export const ImportEnvVariablesBodySchema = t.Object({
  entries: t.Array(ImportEntrySchema, { minItems: 1 }),
});

export const ImportEnvVariablesResponseSchema = t.Object({
  imported: t.Number(),
  updated: t.Number(),
  variables: t.Array(EnvVariableWithValueResponseSchema),
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
  vaultId: t.String(),
  vaultName: t.String(),
  entries: t.Array(ExportEntrySchema),
});

export const EnvExampleResponseSchema = t.Object({
  vaultId: t.String(),
  vaultName: t.String(),
  content: t.String(),
});

export type ImportEnvVariablesBody = Static<typeof ImportEnvVariablesBodySchema>;
export type ImportEnvVariablesResponse = Static<typeof ImportEnvVariablesResponseSchema>;
export type ExportEnvVariablesResponse = Static<typeof ExportEnvVariablesResponseSchema>;
export type EnvExampleResponse = Static<typeof EnvExampleResponseSchema>;
