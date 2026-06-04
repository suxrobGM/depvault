/** Vault re-keying operations: password change, recovery, and recovery key regeneration. */

import {
  deriveKEK,
  exportDEK,
  generateKeyPair,
  generateRecoveryKey,
  generateSalt,
  importDEK,
  importPrivateKey,
  importRecoveryKey,
  PBKDF2_ITERATIONS,
  recoveryKeyToBytes,
  toBase64,
  unwrapKey,
  wrapKey,
  type PasswordChangeResult,
  type RecoverVaultResult,
  type RegenerateRecoveryKeyResult,
  type VaultInfo,
} from "@depvault/crypto";
import { client } from "@/api/client";

interface GrantPayload {
  projectId: string;
  wrappedDek: string;
  wrappedDekIv: string;
  wrappedDekTag: string;
}

/**
 * Re-wrap every project DEK under a new key. Collects DEKs from the in-memory cache first, then
 * unwraps any server grants not already cached using the old key, and finally wraps each DEK with
 * the new key. Shared by the password-change (SELF grants under the KEK) and recovery-key
 * regeneration (RECOVERY grants under the recovery key) flows, which differ only in which key
 * the grants are wrapped under and which endpoint lists them.
 */
async function rewrapGrants(args: {
  cachedDeks: ReadonlyMap<string, CryptoKey>;
  oldKey: CryptoKey;
  newKey: CryptoKey;
  fetchGrants: () => Promise<GrantPayload[] | null | undefined>;
}): Promise<GrantPayload[]> {
  const { cachedDeks, oldKey, newKey, fetchGrants } = args;

  const projectDeks = new Map<string, CryptoKey>(cachedDeks);

  const grants = await fetchGrants();
  if (grants) {
    for (const grant of grants) {
      if (!projectDeks.has(grant.projectId)) {
        const dekRaw = await unwrapKey(
          grant.wrappedDek,
          grant.wrappedDekIv,
          grant.wrappedDekTag,
          oldKey,
        );
        projectDeks.set(grant.projectId, await importDEK(dekRaw));
      }
    }
  }

  const updatedGrants: GrantPayload[] = [];
  for (const [projectId, dek] of projectDeks.entries()) {
    const dekRaw = await exportDEK(dek);
    const wrapped = await wrapKey(dekRaw, newKey);
    updatedGrants.push({
      projectId,
      wrappedDek: wrapped.wrapped,
      wrappedDekIv: wrapped.iv,
      wrappedDekTag: wrapped.tag,
    });
  }

  return updatedGrants;
}

/**
 * Re-wraps the private key, recovery key, and all project DEKs with a new KEK.
 *
 * The private key and recovery key CryptoKey instances held in memory are intentionally
 * non-extractable (see importPrivateKey/importRecoveryKey), so we cannot re-wrap them by
 * exporting the in-memory keys. Instead, we unwrap the ciphertext blobs that are already
 * stored on the server — those are the authoritative source of the raw key bytes — using
 * the current (old) KEK, and then re-wrap the raw bytes under the new KEK.
 */
export async function changeVaultPasswordOps(
  newPassword: string,
  oldKek: CryptoKey,
  vaultInfo: VaultInfo,
  cachedDeks: ReadonlyMap<string, CryptoKey>,
): Promise<PasswordChangeResult> {
  const newSalt = generateSalt();
  const newKek = await deriveKEK(newPassword, newSalt);

  const privateKeyRaw = await unwrapKey(
    vaultInfo.wrappedPrivateKey,
    vaultInfo.wrappedPrivateKeyIv,
    vaultInfo.wrappedPrivateKeyTag,
    oldKek,
  );

  const newWrappedPrivate = await wrapKey(privateKeyRaw, newKek);

  const recoveryRaw = await unwrapKey(
    vaultInfo.wrappedRecoveryKey,
    vaultInfo.wrappedRecoveryKeyIv,
    vaultInfo.wrappedRecoveryKeyTag,
    oldKek,
  );

  const wrappedRecovery = await wrapKey(recoveryRaw, newKek);

  const updatedGrants = await rewrapGrants({
    cachedDeks,
    oldKey: oldKek,
    newKey: newKek,
    fetchGrants: async () => (await client.api.vault.keygrants.self.get()).data,
  });

  const kekSalt = toBase64(newSalt.buffer as ArrayBuffer);

  await client.api.vault.password.put({
    newKekSalt: kekSalt,
    newKekIterations: PBKDF2_ITERATIONS,
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
    vaultInfo: {
      ...vaultInfo,
      kekSalt,
      kekIterations: PBKDF2_ITERATIONS,
      wrappedPrivateKey: newWrappedPrivate.wrapped,
      wrappedPrivateKeyIv: newWrappedPrivate.iv,
      wrappedPrivateKeyTag: newWrappedPrivate.tag,
      wrappedRecoveryKey: wrappedRecovery.wrapped,
      wrappedRecoveryKeyIv: wrappedRecovery.iv,
      wrappedRecoveryKeyTag: wrappedRecovery.tag,
    },
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
    newKekIterations: PBKDF2_ITERATIONS,
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
      kekIterations: PBKDF2_ITERATIONS,
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

  const updatedGrants = await rewrapGrants({
    cachedDeks,
    oldKey: oldRecoveryKey,
    newKey: newRecoveryKey,
    fetchGrants: async () => (await client.api.vault.keygrants.recovery.get()).data,
  });

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
