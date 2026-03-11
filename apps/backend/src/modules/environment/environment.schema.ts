import { CONFIG_FORMAT_VALUES } from "@shared/constants/config-formats";
import { t, type Static } from "elysia";
import { EnvironmentType } from "@/generated/prisma";

export const EnvironmentTypeSchema = t.Enum(EnvironmentType);

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

export const EnvVariableListQuerySchema = t.Object({
  vaultGroupId: t.String(),
  environmentType: t.Optional(EnvironmentTypeSchema),
  page: t.Integer({ minimum: 1, default: 1 }),
  limit: t.Integer({ minimum: 1, maximum: 100, default: 20 }),
});

export const EnvVariableListResponseSchema = t.Object({
  items: t.Array(EnvVariableWithValueResponseSchema),
  pagination: t.Object({
    page: t.Number(),
    limit: t.Number(),
    total: t.Number(),
    totalPages: t.Number(),
  }),
});

export const EnvVariableParamsSchema = t.Object({
  id: t.String(),
  varId: t.String(),
});

const ConfigFormatSchema = t.Union(CONFIG_FORMAT_VALUES.map((v) => t.Literal(v)));

export const ImportEnvVariablesBodySchema = t.Object({
  vaultGroupId: t.String(),
  environmentType: EnvironmentTypeSchema,
  format: ConfigFormatSchema,
  content: t.String({ minLength: 1 }),
});

export const ImportEnvVariablesResponseSchema = t.Object({
  imported: t.Number(),
  skipped: t.Number(),
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

export const EnvExampleResponseSchema = t.Object({
  content: t.String(),
  environmentType: EnvironmentTypeSchema,
});

export const EnvExampleQuerySchema = t.Object({
  vaultGroupId: t.String(),
  environmentType: EnvironmentTypeSchema,
});

export const EnvironmentResponseSchema = t.Object({
  id: t.String(),
  type: EnvironmentTypeSchema,
  vaultGroupId: t.String(),
  vaultGroupName: t.String(),
  variableCount: t.Number(),
  createdAt: t.Date(),
});

export const EnvironmentListQuerySchema = t.Object({
  vaultGroupId: t.Optional(t.String()),
});

export const EnvironmentListResponseSchema = t.Array(EnvironmentResponseSchema);

export const EnvDiffQuerySchema = t.Object({
  vaultGroupId: t.String(),
  environments: t.String({ minLength: 1 }),
});

const EnvDiffValueSchema = t.Object({
  value: t.String(),
  exists: t.Boolean(),
  environmentId: t.String(),
  updatedAt: t.Date(),
});

const EnvDiffRowSchema = t.Object({
  key: t.String(),
  description: t.Nullable(t.String()),
  isRequired: t.Boolean(),
  status: t.Union([t.Literal("match"), t.Literal("mismatch"), t.Literal("missing")]),
  values: t.Record(t.String(), t.Nullable(EnvDiffValueSchema)),
});

export const EnvDiffResponseSchema = t.Object({
  environments: t.Array(t.String()),
  rows: t.Array(EnvDiffRowSchema),
});

export type EnvDiffResponse = Static<typeof EnvDiffResponseSchema>;
export type EnvDiffRow = Static<typeof EnvDiffRowSchema>;

export const CloneEnvironmentBodySchema = t.Object({
  vaultGroupId: t.String(),
  sourceType: EnvironmentTypeSchema,
  targetType: EnvironmentTypeSchema,
});

export const CloneEnvironmentResponseSchema = t.Object({
  id: t.String(),
  type: EnvironmentTypeSchema,
  variableCount: t.Number(),
});

export const DeleteEnvironmentParamsSchema = t.Object({
  id: t.String(),
  envId: t.String(),
});

export type CloneEnvironmentBody = Static<typeof CloneEnvironmentBodySchema>;

export type EnvironmentResponse = Static<typeof EnvironmentResponseSchema>;
export type CreateEnvVariableBody = Static<typeof CreateEnvVariableBodySchema>;
export type UpdateEnvVariableBody = Static<typeof UpdateEnvVariableBodySchema>;
export type EnvVariableResponse = Static<typeof EnvVariableResponseSchema>;
export type EnvVariableWithValueResponse = Static<typeof EnvVariableWithValueResponseSchema>;
export type EnvVariableListQuery = Static<typeof EnvVariableListQuerySchema>;
export type ImportEnvVariablesBody = Static<typeof ImportEnvVariablesBodySchema>;
export type ExportEnvVariablesQuery = Static<typeof ExportEnvVariablesQuerySchema>;
