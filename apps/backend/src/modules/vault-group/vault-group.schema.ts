import { t, type Static } from "elysia";
import { tDateTime } from "@/types/schema";

export const CreateVaultGroupBodySchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  description: t.Optional(t.String({ maxLength: 500 })),
});

export const UpdateVaultGroupBodySchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  description: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
  sortOrder: t.Optional(t.Integer({ minimum: 0 })),
});

export const VaultGroupParamsSchema = t.Object({
  id: t.String(),
  groupId: t.String(),
});

export const VaultGroupResponseSchema = t.Object({
  id: t.String(),
  name: t.String(),
  description: t.Nullable(t.String()),
  sortOrder: t.Number(),
  environmentCount: t.Number(),
  variableCount: t.Number(),
  createdAt: tDateTime(),
  updatedAt: tDateTime(),
});

export const VaultGroupListResponseSchema = t.Array(VaultGroupResponseSchema);

export type CreateVaultGroupBody = Static<typeof CreateVaultGroupBodySchema>;
export type UpdateVaultGroupBody = Static<typeof UpdateVaultGroupBodySchema>;
export type VaultGroupResponse = Static<typeof VaultGroupResponseSchema>;
