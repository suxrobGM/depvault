import { t, type Static } from "elysia";
import { KeyGrantType } from "@/generated/prisma";

// ── Request Schemas ──

export const SetupVaultBodySchema = t.Object({
  kekSalt: t.String({ minLength: 1 }),
  kekIterations: t.Integer({ minimum: 100000 }),
  publicKey: t.String({ minLength: 1 }),
  wrappedPrivateKey: t.String({ minLength: 1 }),
  wrappedPrivateKeyIv: t.String({ minLength: 1 }),
  wrappedPrivateKeyTag: t.String({ minLength: 1 }),
  recoveryKeyHash: t.String({ minLength: 1 }),
});

export const ChangeVaultPasswordBodySchema = t.Object({
  newKekSalt: t.String({ minLength: 1 }),
  newKekIterations: t.Integer({ minimum: 100000 }),
  newWrappedPrivateKey: t.String({ minLength: 1 }),
  newWrappedPrivateKeyIv: t.String({ minLength: 1 }),
  newWrappedPrivateKeyTag: t.String({ minLength: 1 }),
  updatedGrants: t.Array(
    t.Object({
      projectId: t.String({ format: "uuid" }),
      wrappedDek: t.String({ minLength: 1 }),
      wrappedDekIv: t.String({ minLength: 1 }),
      wrappedDekTag: t.String({ minLength: 1 }),
    }),
  ),
});

export const RecoverVaultBodySchema = t.Object({
  newKekSalt: t.String({ minLength: 1 }),
  newKekIterations: t.Integer({ minimum: 100000 }),
  newPublicKey: t.String({ minLength: 1 }),
  newWrappedPrivateKey: t.String({ minLength: 1 }),
  newWrappedPrivateKeyIv: t.String({ minLength: 1 }),
  newWrappedPrivateKeyTag: t.String({ minLength: 1 }),
  newRecoveryKeyHash: t.String({ minLength: 1 }),
  updatedGrants: t.Array(
    t.Object({
      projectId: t.String({ format: "uuid" }),
      wrappedDek: t.String({ minLength: 1 }),
      wrappedDekIv: t.String({ minLength: 1 }),
      wrappedDekTag: t.String({ minLength: 1 }),
    }),
  ),
});

// ── Response Schemas ──

export const VaultStatusResponseSchema = t.Object({
  hasVault: t.Boolean(),
  kekSalt: t.Optional(t.Nullable(t.String())),
  kekIterations: t.Optional(t.Nullable(t.Integer())),
  publicKey: t.Optional(t.Nullable(t.String())),
  wrappedPrivateKey: t.Optional(t.Nullable(t.String())),
  wrappedPrivateKeyIv: t.Optional(t.Nullable(t.String())),
  wrappedPrivateKeyTag: t.Optional(t.Nullable(t.String())),
});

export const PublicKeyResponseSchema = t.Object({
  userId: t.String(),
  publicKey: t.String(),
  hasVault: t.Boolean(),
});

export const MessageResponseSchema = t.Object({
  message: t.String(),
});

// ── Key Grant Schemas ──

export const CreateKeyGrantBodySchema = t.Object({
  userId: t.String({ format: "uuid" }),
  wrappedDek: t.String({ minLength: 1 }),
  wrappedDekIv: t.String({ minLength: 1 }),
  wrappedDekTag: t.String({ minLength: 1 }),
  granterPublicKey: t.Optional(t.String()),
  grantType: t.Optional(t.Enum(KeyGrantType, { default: KeyGrantType.ECDH })),
});

export const KeyGrantResponseSchema = t.Object({
  id: t.String(),
  projectId: t.String(),
  userId: t.String(),
  wrappedDek: t.String(),
  wrappedDekIv: t.String(),
  wrappedDekTag: t.String(),
  granterPublicKey: t.Nullable(t.String()),
  grantType: t.Enum(KeyGrantType),
});

export const PendingGrantMemberSchema = t.Object({
  userId: t.String(),
  email: t.String(),
  firstName: t.String(),
  lastName: t.String(),
  hasVault: t.Boolean(),
  publicKey: t.Nullable(t.String()),
});

export const BatchUpdateGrantsBodySchema = t.Array(
  t.Object({
    projectId: t.String({ format: "uuid" }),
    wrappedDek: t.String({ minLength: 1 }),
    wrappedDekIv: t.String({ minLength: 1 }),
    wrappedDekTag: t.String({ minLength: 1 }),
  }),
);

// ── Type Aliases ──

export type SetupVaultBody = Static<typeof SetupVaultBodySchema>;
export type ChangeVaultPasswordBody = Static<typeof ChangeVaultPasswordBodySchema>;
export type RecoverVaultBody = Static<typeof RecoverVaultBodySchema>;
export type CreateKeyGrantBody = Static<typeof CreateKeyGrantBodySchema>;
