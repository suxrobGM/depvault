import { CONFIG_FORMAT_VALUES } from "@depvault/shared/constants";
import { t, type Static } from "elysia";
import { PaginationQuerySchema } from "@/types/pagination";
import { PaginatedResponseSchema } from "@/types/response";
import { EnvironmentTypeSchema } from "./environment.schema";

export const CreateEnvVariableBodySchema = t.Object({
  vaultGroupId: t.String(),
  environmentType: EnvironmentTypeSchema,
  key: t.String({ minLength: 1, maxLength: 255 }),
  value: t.String(),
  description: t.Optional(t.String({ maxLength: 500 })),
  isRequired: t.Optional(t.Boolean()),
});

export const UpdateEnvVariableBodySchema = t.Object({
  key: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  value: t.Optional(t.String()),
  description: t.Optional(t.String({ maxLength: 500 })),
  isRequired: t.Optional(t.Boolean()),
});

export const EnvVariableResponseSchema = t.Object({
  id: t.String(),
  environmentId: t.String(),
  key: t.String(),
  description: t.Nullable(t.String()),
  isRequired: t.Boolean(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

export const EnvVariableWithValueResponseSchema = t.Object({
  id: t.String(),
  environmentId: t.String(),
  key: t.String(),
  value: t.String(),
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

const ConfigFormatSchema = t.UnionEnum(CONFIG_FORMAT_VALUES);

export const ImportEnvVariablesBodySchema = t.Object({
  vaultGroupId: t.String(),
  environmentType: EnvironmentTypeSchema,
  format: ConfigFormatSchema,
  content: t.String({ minLength: 1 }),
});

export const ImportEnvVariablesResponseSchema = t.Object({
  imported: t.Number(),
  updated: t.Number(),
  variables: t.Array(EnvVariableWithValueResponseSchema),
});

export const ExportEnvVariablesQuerySchema = t.Object({
  vaultGroupId: t.String(),
  environmentType: EnvironmentTypeSchema,
  format: ConfigFormatSchema,
});

export const ExportEnvVariablesResponseSchema = t.Object({
  content: t.String(),
  format: t.String(),
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
export type ExportEnvVariablesQuery = Static<typeof ExportEnvVariablesQuerySchema>;
export type BatchDeleteEnvVariablesBody = Static<typeof BatchDeleteEnvVariablesBodySchema>;
