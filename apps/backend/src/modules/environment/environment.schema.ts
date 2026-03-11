import { t, type Static } from "elysia";
import { EnvironmentType } from "@/generated/prisma";

export const EnvironmentTypeSchema = t.Enum(EnvironmentType);

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

export type EnvironmentResponse = Static<typeof EnvironmentResponseSchema>;
export type EnvDiffResponse = Static<typeof EnvDiffResponseSchema>;
export type EnvDiffRow = Static<typeof EnvDiffRowSchema>;
export type CloneEnvironmentBody = Static<typeof CloneEnvironmentBodySchema>;
