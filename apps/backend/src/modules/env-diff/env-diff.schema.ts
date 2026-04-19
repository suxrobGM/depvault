import { t, type Static } from "elysia";

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

export type EnvDiffResponse = Static<typeof EnvDiffResponseSchema>;
export type EnvDiffRow = Static<typeof EnvDiffRowSchema>;
