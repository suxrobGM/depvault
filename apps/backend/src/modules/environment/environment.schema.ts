import { t, type Static } from "elysia";
import { EnvironmentType } from "@/generated/prisma";

export const EnvironmentTypeSchema = t.Enum(EnvironmentType);

export const EnvironmentResponseSchema = t.Object({
  id: t.String(),
  type: EnvironmentTypeSchema,
  vaultGroupId: t.String(),
  vaultGroupName: t.String(),
  variableCount: t.Number(),
  secretFileCount: t.Number(),
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
  encryptedValue: t.String(),
  iv: t.String(),
  authTag: t.String(),
  exists: t.Boolean(),
  environmentId: t.String(),
  updatedAt: t.Date(),
});

const EnvDiffRowSchema = t.Object({
  key: t.String(),
  description: t.Nullable(t.String()),
  isRequired: t.Boolean(),
  status: t.UnionEnum(["match", "missing"]),
  values: t.Record(t.String(), t.Nullable(EnvDiffValueSchema)),
});

export const EnvDiffResponseSchema = t.Object({
  environments: t.Array(t.String()),
  rows: t.Array(EnvDiffRowSchema),
});

const SyncEntrySchema = t.Object({
  key: t.String({ minLength: 1, maxLength: 255 }),
  encryptedValue: t.String({ minLength: 1 }),
  iv: t.String({ minLength: 1 }),
  authTag: t.String({ minLength: 1 }),
  description: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
  isRequired: t.Optional(t.Boolean()),
  sortOrder: t.Optional(t.Number()),
  encryptedComment: t.Optional(t.String()),
  commentIv: t.Optional(t.String()),
  commentAuthTag: t.Optional(t.String()),
});

export const SyncEnvironmentBodySchema = t.Object({
  vaultGroupId: t.String(),
  sourceEnvironmentType: EnvironmentTypeSchema,
  targetEnvironmentType: EnvironmentTypeSchema,
  entries: t.Array(SyncEntrySchema, { minItems: 1 }),
});

export const SyncEnvironmentResponseSchema = t.Object({
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
export type SyncEnvironmentBody = Static<typeof SyncEnvironmentBodySchema>;
export type SyncEnvironmentResponse = Static<typeof SyncEnvironmentResponseSchema>;
