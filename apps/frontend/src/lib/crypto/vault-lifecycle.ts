/** Vault status fetching, password-based unlock, and initial vault setup. */

import { client } from "@/lib/api";
import {
  deriveKEK,
  fromBase64,
  generateKeyPair,
  generateRecoveryKey,
  generateSalt,
  importPrivateKey,
  importRecoveryKey,
  recoveryKeyToBytes,
  toBase64,
  unwrapKey,
  wrapKey,
} from "./index";
import type { VaultInfo, VaultKeys, VaultSetupResult } from "./vault-types";

/** Fetches vault status from the API. Returns VaultInfo if vault exists, null otherwise. */
export async function fetchVaultInfo(): Promise<VaultInfo | null> {
  const { data } = await client.api.vault.status.get();
  if (!data?.hasVault) return null;

  return {
    kekSalt: data.kekSalt!,
    kekIterations: data.kekIterations!,
    publicKey: data.publicKey!,
    wrappedPrivateKey: data.wrappedPrivateKey!,
    wrappedPrivateKeyIv: data.wrappedPrivateKeyIv!,
    wrappedPrivateKeyTag: data.wrappedPrivateKeyTag!,
    recoveryKeyHash: data.recoveryKeyHash!,
    wrappedRecoveryKey: data.wrappedRecoveryKey!,
    wrappedRecoveryKeyIv: data.wrappedRecoveryKeyIv!,
    wrappedRecoveryKeyTag: data.wrappedRecoveryKeyTag!,
  };
}

/** Derives KEK from password, unwraps the ECDH private key and the recovery key. */
export async function unlockVaultKeys(password: string, info: VaultInfo): Promise<VaultKeys> {
  const salt = fromBase64(info.kekSalt);
  const kek = await deriveKEK(password, salt, info.kekIterations);

  let privateKey: CryptoKey;
  try {
    const raw = await unwrapKey(
      info.wrappedPrivateKey,
      info.wrappedPrivateKeyIv,
      info.wrappedPrivateKeyTag,
      kek,
    );
    privateKey = await importPrivateKey(raw);
  } catch {
    throw new Error("Incorrect vault password");
  }

  const recoveryBytes = await unwrapKey(
    info.wrappedRecoveryKey,
    info.wrappedRecoveryKeyIv,
    info.wrappedRecoveryKeyTag,
    kek,
  );
  const recoveryKey = await importRecoveryKey(recoveryBytes);

  return { kek, privateKey, recoveryKey };
}

/** Creates a new vault: generates keypair, wraps keys, posts to backend. */
export async function createVault(password: string): Promise<VaultSetupResult> {
  const salt = generateSalt();
  const kek = await deriveKEK(password, salt);
  const keyPair = await generateKeyPair();
  const wrappedPrivate = await wrapKey(keyPair.privateKeyRaw, kek);

  const recoveryKeyFormatted = generateRecoveryKey();
  const recoveryBytes = recoveryKeyToBytes(recoveryKeyFormatted);
  const recoveryHash = toBase64(
    await crypto.subtle.digest("SHA-256", recoveryBytes.buffer as ArrayBuffer),
  );
  const recoveryKeyCryptoKey = await importRecoveryKey(recoveryBytes);
  const wrappedRecovery = await wrapKey(recoveryBytes, kek);

  const kekSalt = toBase64(salt.buffer as ArrayBuffer);

  await client.api.vault.setup.post({
    kekSalt,
    kekIterations: 600_000,
    publicKey: keyPair.publicKey,
    wrappedPrivateKey: wrappedPrivate.wrapped,
    wrappedPrivateKeyIv: wrappedPrivate.iv,
    wrappedPrivateKeyTag: wrappedPrivate.tag,
    recoveryKeyHash: recoveryHash,
    wrappedRecoveryKey: wrappedRecovery.wrapped,
    wrappedRecoveryKeyIv: wrappedRecovery.iv,
    wrappedRecoveryKeyTag: wrappedRecovery.tag,
  });

  const privateKey = await importPrivateKey(keyPair.privateKeyRaw);

  return {
    keys: { kek, privateKey, recoveryKey: recoveryKeyCryptoKey },
    vaultInfo: {
      kekSalt,
      kekIterations: 600_000,
      publicKey: keyPair.publicKey,
      wrappedPrivateKey: wrappedPrivate.wrapped,
      wrappedPrivateKeyIv: wrappedPrivate.iv,
      wrappedPrivateKeyTag: wrappedPrivate.tag,
      recoveryKeyHash: recoveryHash,
      wrappedRecoveryKey: wrappedRecovery.wrapped,
      wrappedRecoveryKeyIv: wrappedRecovery.iv,
      wrappedRecoveryKeyTag: wrappedRecovery.tag,
    },
    recoveryKey: recoveryKeyFormatted,
  };
}
