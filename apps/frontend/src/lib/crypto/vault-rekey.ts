/** Vault re-keying operations: password change, recovery, and recovery key regeneration. */

import { client } from "@/lib/api";
import {
  deriveKEK,
  exportDEK,
  generateKeyPair,
  generateRecoveryKey,
  generateSalt,
  importDEK,
  importPrivateKey,
  importRecoveryKey,
  recoveryKeyToBytes,
  toBase64,
  unwrapKey,
  wrapKey,
} from "./index";
import type {
  PasswordChangeResult,
  RecoverVaultResult,
  RegenerateRecoveryKeyResult,
} from "./vault-types";

/** Re-wraps the private key, recovery key, and all project DEKs with a new KEK. */
export async function changeVaultPasswordOps(
  newPassword: string,
  oldKek: CryptoKey,
  privateKey: CryptoKey,
  recoveryKey: CryptoKey,
  cachedDeks: ReadonlyMap<string, CryptoKey>,
): Promise<PasswordChangeResult> {
  const newSalt = generateSalt();
  const newKek = await deriveKEK(newPassword, newSalt);

  const privateKeyRaw = new Uint8Array(await crypto.subtle.exportKey("pkcs8", privateKey));
  const newWrappedPrivate = await wrapKey(privateKeyRaw, newKek);

  const recoveryRaw = new Uint8Array(await crypto.subtle.exportKey("raw", recoveryKey));
  const wrappedRecovery = await wrapKey(recoveryRaw, newKek);

  // Collect all project DEKs: from cache + from SELF grants not yet cached
  const projectDeks = new Map<string, CryptoKey>(cachedDeks);

  const { data: selfGrants } = await client.api.vault.keygrants.self.get();
  if (selfGrants) {
    for (const grant of selfGrants) {
      if (!projectDeks.has(grant.projectId)) {
        const dekRaw = await unwrapKey(
          grant.wrappedDek,
          grant.wrappedDekIv,
          grant.wrappedDekTag,
          oldKek,
        );
        projectDeks.set(grant.projectId, await importDEK(dekRaw));
      }
    }
  }

  const updatedGrants: Array<{
    projectId: string;
    wrappedDek: string;
    wrappedDekIv: string;
    wrappedDekTag: string;
  }> = [];

  for (const [projectId, dek] of projectDeks.entries()) {
    const dekRaw = await exportDEK(dek);
    const wrapped = await wrapKey(dekRaw, newKek);
    updatedGrants.push({
      projectId,
      wrappedDek: wrapped.wrapped,
      wrappedDekIv: wrapped.iv,
      wrappedDekTag: wrapped.tag,
    });
  }

  const kekSalt = toBase64(newSalt.buffer as ArrayBuffer);

  await client.api.vault.password.put({
    newKekSalt: kekSalt,
    newKekIterations: 600_000,
    newWrappedPrivateKey: newWrappedPrivate.wrapped,
    newWrappedPrivateKeyIv: newWrappedPrivate.iv,
    newWrappedPrivateKeyTag: newWrappedPrivate.tag,
    newWrappedRecoveryKey: wrappedRecovery.wrapped,
    newWrappedRecoveryKeyIv: wrappedRecovery.iv,
    newWrappedRecoveryKeyTag: wrappedRecovery.tag,
    updatedGrants,
  });

  return {
    kek: newKek,
    kekSalt,
    kekIterations: 600_000,
    wrappedPrivateKey: newWrappedPrivate.wrapped,
    wrappedPrivateKeyIv: newWrappedPrivate.iv,
    wrappedPrivateKeyTag: newWrappedPrivate.tag,
    wrappedRecoveryKey: wrappedRecovery.wrapped,
    wrappedRecoveryKeyIv: wrappedRecovery.iv,
    wrappedRecoveryKeyTag: wrappedRecovery.tag,
  };
}

/** Recover vault access using a recovery key. Unwraps all RECOVERY grants and sets a new password. */
export async function recoverVaultOps(
  recoveryKeyFormatted: string,
  newPassword: string,
): Promise<RecoverVaultResult> {
  const recoveryBytes = recoveryKeyToBytes(recoveryKeyFormatted);
  const recoveryKeyCryptoKey = await importRecoveryKey(recoveryBytes);
  const recoveryHash = toBase64(
    await crypto.subtle.digest("SHA-256", recoveryBytes.buffer as ArrayBuffer),
  );

  const { data: recoveryGrants } = await client.api.vault.keygrants.recovery.get();
  if (!recoveryGrants || recoveryGrants.length === 0) {
    throw new Error("No recovery grants found. Cannot recover vault.");
  }

  // Unwrap each DEK with the recovery key (implicitly verifies the key is correct)
  const projectDeks: Array<{ projectId: string; dek: CryptoKey; dekRaw: Uint8Array }> = [];
  for (const grant of recoveryGrants) {
    const dekRaw = await unwrapKey(
      grant.wrappedDek,
      grant.wrappedDekIv,
      grant.wrappedDekTag,
      recoveryKeyCryptoKey,
    );
    const dek = await importDEK(dekRaw);
    projectDeks.push({ projectId: grant.projectId, dek, dekRaw });
  }

  const newSalt = generateSalt();
  const newKek = await deriveKEK(newPassword, newSalt);
  const newKeyPair = await generateKeyPair();
  const newWrappedPrivate = await wrapKey(newKeyPair.privateKeyRaw, newKek);
  const newWrappedRecovery = await wrapKey(recoveryBytes, newKek);

  const kekSalt = toBase64(newSalt.buffer as ArrayBuffer);

  // Re-wrap each DEK as both SELF (new KEK) and RECOVERY (same recovery key)
  const updatedGrants: Array<{
    projectId: string;
    grantType: "SELF" | "ECDH" | "RECOVERY";
    wrappedDek: string;
    wrappedDekIv: string;
    wrappedDekTag: string;
  }> = [];

  for (const { projectId, dekRaw } of projectDeks) {
    const selfWrapped = await wrapKey(new Uint8Array(dekRaw), newKek);
    updatedGrants.push({
      projectId,
      grantType: "SELF",
      wrappedDek: selfWrapped.wrapped,
      wrappedDekIv: selfWrapped.iv,
      wrappedDekTag: selfWrapped.tag,
    });

    const recoveryWrapped = await wrapKey(new Uint8Array(dekRaw), recoveryKeyCryptoKey);
    updatedGrants.push({
      projectId,
      grantType: "RECOVERY",
      wrappedDek: recoveryWrapped.wrapped,
      wrappedDekIv: recoveryWrapped.iv,
      wrappedDekTag: recoveryWrapped.tag,
    });
  }

  const newPrivateKey = await importPrivateKey(newKeyPair.privateKeyRaw);

  await client.api.vault.recover.post({
    newKekSalt: kekSalt,
    newKekIterations: 600_000,
    newPublicKey: newKeyPair.publicKey,
    newWrappedPrivateKey: newWrappedPrivate.wrapped,
    newWrappedPrivateKeyIv: newWrappedPrivate.iv,
    newWrappedPrivateKeyTag: newWrappedPrivate.tag,
    newRecoveryKeyHash: recoveryHash,
    newWrappedRecoveryKey: newWrappedRecovery.wrapped,
    newWrappedRecoveryKeyIv: newWrappedRecovery.iv,
    newWrappedRecoveryKeyTag: newWrappedRecovery.tag,
    updatedGrants,
  });

  return {
    keys: { kek: newKek, privateKey: newPrivateKey, recoveryKey: recoveryKeyCryptoKey },
    vaultInfo: {
      kekSalt,
      kekIterations: 600_000,
      publicKey: newKeyPair.publicKey,
      wrappedPrivateKey: newWrappedPrivate.wrapped,
      wrappedPrivateKeyIv: newWrappedPrivate.iv,
      wrappedPrivateKeyTag: newWrappedPrivate.tag,
      recoveryKeyHash: recoveryHash,
      wrappedRecoveryKey: newWrappedRecovery.wrapped,
      wrappedRecoveryKeyIv: newWrappedRecovery.iv,
      wrappedRecoveryKeyTag: newWrappedRecovery.tag,
    },
  };
}

/** Generate a new recovery key, re-wrap all RECOVERY grants, and update the vault. */
export async function regenerateRecoveryKeyOps(
  kek: CryptoKey,
  oldRecoveryKey: CryptoKey,
  cachedDeks: ReadonlyMap<string, CryptoKey>,
): Promise<RegenerateRecoveryKeyResult> {
  const newRecoveryFormatted = generateRecoveryKey();
  const newRecoveryBytes = recoveryKeyToBytes(newRecoveryFormatted);
  const newRecoveryHash = toBase64(
    await crypto.subtle.digest("SHA-256", newRecoveryBytes.buffer as ArrayBuffer),
  );
  const newRecoveryKey = await importRecoveryKey(newRecoveryBytes);
  const newWrappedRecovery = await wrapKey(newRecoveryBytes, kek);

  // Collect all project DEKs: from cache + from existing RECOVERY grants
  const projectDeks = new Map<string, CryptoKey>();
  for (const [projectId, dek] of cachedDeks.entries()) {
    projectDeks.set(projectId, dek);
  }

  const { data: existingGrants } = await client.api.vault.keygrants.recovery.get();
  if (existingGrants) {
    for (const grant of existingGrants) {
      if (!projectDeks.has(grant.projectId)) {
        const dekRaw = await unwrapKey(
          grant.wrappedDek,
          grant.wrappedDekIv,
          grant.wrappedDekTag,
          oldRecoveryKey,
        );
        projectDeks.set(grant.projectId, await importDEK(dekRaw));
      }
    }
  }

  const updatedGrants: Array<{
    projectId: string;
    wrappedDek: string;
    wrappedDekIv: string;
    wrappedDekTag: string;
  }> = [];

  for (const [projectId, dek] of projectDeks.entries()) {
    const dekRaw = await exportDEK(dek);
    const wrapped = await wrapKey(dekRaw, newRecoveryKey);
    updatedGrants.push({
      projectId,
      wrappedDek: wrapped.wrapped,
      wrappedDekIv: wrapped.iv,
      wrappedDekTag: wrapped.tag,
    });
  }

  await client.api.vault.recoverykey.put({
    newRecoveryKeyHash: newRecoveryHash,
    newWrappedRecoveryKey: newWrappedRecovery.wrapped,
    newWrappedRecoveryKeyIv: newWrappedRecovery.iv,
    newWrappedRecoveryKeyTag: newWrappedRecovery.tag,
    updatedGrants,
  });

  return {
    recoveryKey: newRecoveryFormatted,
    recoveryKeyCryptoKey: newRecoveryKey,
  };
}
