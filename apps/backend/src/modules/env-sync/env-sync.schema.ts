import { t, type Static } from "elysia";
import { EnvironmentTypeSchema } from "@/modules/environment";

const SyncEntrySchema = t.Object({
  key: t.String({ minLength: 1, maxLength: 255 }),
  encryptedValue: t.String(),
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

export type SyncEnvironmentBody = Static<typeof SyncEnvironmentBodySchema>;
export type SyncEnvironmentResponse = Static<typeof SyncEnvironmentResponseSchema>;
