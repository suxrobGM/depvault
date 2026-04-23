import { t, type Static } from "elysia";

export const VaultResponseSchema = t.Object({
  id: t.String(),
  projectId: t.String(),
  name: t.String(),
  directoryPath: t.Nullable(t.String()),
  tags: t.Array(t.String()),
  variableCount: t.Number(),
  secretFileCount: t.Number(),
  requiredTotal: t.Number(),
  requiredFilled: t.Number(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

export const VaultListResponseSchema = t.Array(VaultResponseSchema);

export const CreateVaultBodySchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  directoryPath: t.Optional(t.String({ maxLength: 500 })),
  tags: t.Optional(t.Array(t.String({ minLength: 1, maxLength: 50 }), { maxItems: 20 })),
});

export const UpdateVaultBodySchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  directoryPath: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
  tags: t.Optional(t.Array(t.String({ minLength: 1, maxLength: 50 }), { maxItems: 20 })),
});

export const CloneVaultBodySchema = t.Object({
  targetName: t.String({ minLength: 1, maxLength: 100 }),
});

export const VaultParamsSchema = t.Object({
  id: t.String(),
  vaultId: t.String(),
});

export const VaultTagListResponseSchema = t.Array(t.String());

export type CreateVaultBody = Static<typeof CreateVaultBodySchema>;
export type UpdateVaultBody = Static<typeof UpdateVaultBodySchema>;
export type CloneVaultBody = Static<typeof CloneVaultBodySchema>;
export type VaultResponse = Static<typeof VaultResponseSchema>;
