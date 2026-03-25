import { client } from "@/lib/api";
import {
  deriveKEK,
  deriveSharedKey,
  exportDEK,
  fromBase64,
  generateDEK,
  generateKeyPair,
  generateRecoveryKey,
  generateSalt,
  importDEK,
  importPrivateKey,
  recoveryKeyToBytes,
  toBase64,
  unwrapKey,
  wrapKey,
} from "./index";

// ── Types ──

export interface VaultInfo {
  kekSalt: string;
  kekIterations: number;
  publicKey: string;
  wrappedPrivateKey: string;
  wrappedPrivateKeyIv: string;
  wrappedPrivateKeyTag: string;
}

export interface VaultKeys {
  kek: CryptoKey;
  privateKey: CryptoKey;
}

export interface VaultSetupResult {
  keys: VaultKeys;
  vaultInfo: VaultInfo;
  recoveryKey: string;
}

export interface PasswordChangeResult {
  kek: CryptoKey;
  kekSalt: string;
  kekIterations: number;
  wrappedPrivateKey: string;
  wrappedPrivateKeyIv: string;
  wrappedPrivateKeyTag: string;
}

// ── Vault lifecycle ──

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
  };
}

/** Derives KEK from password and unwraps the ECDH private key. */
export async function unlockVaultKeys(password: string, info: VaultInfo): Promise<VaultKeys> {
  const salt = fromBase64(info.kekSalt);
  const kek = await deriveKEK(password, salt, info.kekIterations);

  try {
    const raw = await unwrapKey(
      info.wrappedPrivateKey,
      info.wrappedPrivateKeyIv,
      info.wrappedPrivateKeyTag,
      kek,
    );
    const privateKey = await importPrivateKey(raw);
    return { kek, privateKey };
  } catch {
    throw new Error("Incorrect vault password");
  }
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

  const kekSalt = toBase64(salt.buffer as ArrayBuffer);

  await client.api.vault.setup.post({
    kekSalt,
    kekIterations: 600_000,
    publicKey: keyPair.publicKey,
    wrappedPrivateKey: wrappedPrivate.wrapped,
    wrappedPrivateKeyIv: wrappedPrivate.iv,
    wrappedPrivateKeyTag: wrappedPrivate.tag,
    recoveryKeyHash: recoveryHash,
  });

  const privateKey = await importPrivateKey(keyPair.privateKeyRaw);

  return {
    keys: { kek, privateKey },
    vaultInfo: {
      kekSalt,
      kekIterations: 600_000,
      publicKey: keyPair.publicKey,
      wrappedPrivateKey: wrappedPrivate.wrapped,
      wrappedPrivateKeyIv: wrappedPrivate.iv,
      wrappedPrivateKeyTag: wrappedPrivate.tag,
    },
    recoveryKey: recoveryKeyFormatted,
  };
}

// ── Project key operations ──

/** Fetches and unwraps a project's DEK from the user's key grant. Returns null if no grant exists. */
export async function resolveProjectDEK(
  projectId: string,
  kek: CryptoKey,
  privateKey: CryptoKey | null,
): Promise<CryptoKey | null> {
  const { data: grant, error } = await client.api
    .projects({ id: projectId })
    ["key-grants"].mine.get();

  if (!grant || error) return null;

  let dekRaw: Uint8Array;

  if (grant.grantType === "SELF") {
    dekRaw = await unwrapKey(grant.wrappedDek, grant.wrappedDekIv, grant.wrappedDekTag, kek);
  } else if (grant.grantType === "ECDH" && grant.granterPublicKey) {
    if (!privateKey) throw new Error("Private key not available");
    const sharedKey = await deriveSharedKey(privateKey, grant.granterPublicKey);
    dekRaw = await unwrapKey(grant.wrappedDek, grant.wrappedDekIv, grant.wrappedDekTag, sharedKey);
  } else {
    throw new Error(`Unsupported grant type: ${grant.grantType}`);
  }

  return importDEK(dekRaw);
}

/** Generates a new DEK, wraps it with KEK, and creates a SELF key grant. Returns the DEK. */
export async function createProjectSelfGrant(
  projectId: string,
  userId: string,
  kek: CryptoKey,
): Promise<CryptoKey> {
  const dek = await generateDEK();
  const dekRaw = await exportDEK(dek);
  const wrapped = await wrapKey(dekRaw, kek);

  await client.api.projects({ id: projectId })["key-grants"].post({
    userId,
    wrappedDek: wrapped.wrapped,
    wrappedDekIv: wrapped.iv,
    wrappedDekTag: wrapped.tag,
    grantType: "SELF",
  });

  return dek;
}

/** Wraps a project DEK with an ECDH shared key and creates a grant for a team member. */
export async function createProjectECDHGrant(
  projectId: string,
  recipientUserId: string,
  recipientPublicKey: string,
  dek: CryptoKey,
  privateKey: CryptoKey,
  granterPublicKey: string,
): Promise<void> {
  const dekRaw = await exportDEK(dek);
  const sharedKey = await deriveSharedKey(privateKey, recipientPublicKey);
  const wrapped = await wrapKey(dekRaw, sharedKey);

  await client.api.projects({ id: projectId })["key-grants"].post({
    userId: recipientUserId,
    wrappedDek: wrapped.wrapped,
    wrappedDekIv: wrapped.iv,
    wrappedDekTag: wrapped.tag,
    granterPublicKey,
    grantType: "ECDH",
  });
}

// ── Password change ──

/**
 * Re-wraps the private key and project DEKs with a new KEK derived from the new password.
 *
 * TODO: Fetch ALL SELF grants from the backend instead of relying on the in-memory cache.
 * Currently only re-wraps DEKs that were accessed this session — projects not visited
 * remain wrapped under the old KEK and become inaccessible after the password change.
 * This requires a new backend endpoint to list all grants for the current user.
 */
export async function changeVaultPasswordOps(
  newPassword: string,
  privateKey: CryptoKey,
  cachedDeks: ReadonlyMap<string, CryptoKey>,
): Promise<PasswordChangeResult> {
  const newSalt = generateSalt();
  const newKek = await deriveKEK(newPassword, newSalt);

  const privateKeyRaw = new Uint8Array(await crypto.subtle.exportKey("pkcs8", privateKey));
  const newWrappedPrivate = await wrapKey(privateKeyRaw, newKek);

  const updatedGrants: Array<{
    projectId: string;
    wrappedDek: string;
    wrappedDekIv: string;
    wrappedDekTag: string;
  }> = [];

  for (const [projectId, dek] of cachedDeks.entries()) {
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
    updatedGrants,
  });

  return {
    kek: newKek,
    kekSalt,
    kekIterations: 600_000,
    wrappedPrivateKey: newWrappedPrivate.wrapped,
    wrappedPrivateKeyIv: newWrappedPrivate.iv,
    wrappedPrivateKeyTag: newWrappedPrivate.tag,
  };
}
