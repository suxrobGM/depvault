import { Elysia, t } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware/auth.middleware";
import { KeyGrantType } from "@/generated/prisma";
import { KeyGrantService } from "./key-grant.service";
import {
  ChangeVaultPasswordBodySchema,
  MessageResponseSchema,
  PublicKeyResponseSchema,
  RecoverVaultBodySchema,
  RecoveryGrantListItemSchema,
  RegenerateRecoveryKeyBodySchema,
  SetupVaultBodySchema,
  VaultStatusResponseSchema,
} from "./vault.schema";
import { VaultService } from "./vault.service";

const vaultService = container.resolve(VaultService);
const keyGrantService = container.resolve(KeyGrantService);

export const vaultController = new Elysia({ prefix: "/vault", detail: { tags: ["Vault"] } })
  .use(authGuard)
  .get("/status", ({ user }) => vaultService.getStatus(user.id), {
    response: VaultStatusResponseSchema,
    detail: {
      operationId: "getVaultStatus",
      summary: "Get vault status",
      description: "Check whether the authenticated user has set up their encryption vault.",
      security: [{ bearerAuth: [] }],
    },
  })
  .post("/setup", ({ user, body }) => vaultService.setup(user.id, body), {
    body: SetupVaultBodySchema,
    response: MessageResponseSchema,
    detail: {
      operationId: "setupVault",
      summary: "Set up vault",
      description:
        "Initialize the user's encryption vault with a KEK salt, ECDH keypair, and recovery key hash.",
      security: [{ bearerAuth: [] }],
    },
  })
  .put("/password", ({ user, body }) => vaultService.changePassword(user.id, body), {
    body: ChangeVaultPasswordBodySchema,
    response: MessageResponseSchema,
    detail: {
      operationId: "changeVaultPassword",
      summary: "Change vault password",
      description:
        "Update the vault password by providing new wrapped keys and re-wrapped project key grants.",
      security: [{ bearerAuth: [] }],
    },
  })
  .post("/recover", ({ user, body }) => vaultService.recover(user.id, body), {
    body: RecoverVaultBodySchema,
    response: MessageResponseSchema,
    detail: {
      operationId: "recoverVault",
      summary: "Recover vault",
      description:
        "Recover vault access using the recovery key. Sets a new vault password and re-wraps all keys.",
      security: [{ bearerAuth: [] }],
    },
  })
  .put("/recoverykey", ({ user, body }) => vaultService.regenerateRecoveryKey(user.id, body), {
    body: RegenerateRecoveryKeyBodySchema,
    response: MessageResponseSchema,
    detail: {
      operationId: "regenerateRecoveryKey",
      summary: "Regenerate recovery key",
      description:
        "Generate a new recovery key while the vault is unlocked. Re-wraps all RECOVERY grants.",
      security: [{ bearerAuth: [] }],
    },
  })
  .get(
    "/keygrants/recovery",
    ({ user }) => keyGrantService.getAllGrantsForUserByType(user.id, KeyGrantType.RECOVERY),
    {
      response: t.Array(RecoveryGrantListItemSchema),
      detail: {
        operationId: "getMyRecoveryGrants",
        summary: "Get all recovery grants",
        description: "Fetch all RECOVERY-type key grants for the current user across all projects.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/keygrants/self",
    ({ user }) => keyGrantService.getAllGrantsForUserByType(user.id, KeyGrantType.SELF),
    {
      response: t.Array(RecoveryGrantListItemSchema),
      detail: {
        operationId: "getMySelfGrants",
        summary: "Get all self grants",
        description: "Fetch all SELF-type key grants for the current user across all projects.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get("/publickey/:userId", ({ params }) => vaultService.getPublicKey(params.userId), {
    params: t.Object({ userId: t.String({ format: "uuid" }) }),
    response: PublicKeyResponseSchema,
    detail: {
      operationId: "getPublicKey",
      summary: "Get user public key",
      description: "Retrieve another user's ECDH public key for key distribution.",
      security: [{ bearerAuth: [] }],
    },
  });
