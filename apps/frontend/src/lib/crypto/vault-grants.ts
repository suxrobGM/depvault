/** Project-level key grant operations: resolve, create SELF/RECOVERY/ECDH grants. */

import { client } from "@/lib/api";
import { deriveSharedKey, exportDEK, generateDEK, importDEK, unwrapKey, wrapKey } from "./index";

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

/** Wraps a DEK with the recovery key and creates a RECOVERY key grant. */
export async function createProjectRecoveryGrant(
  projectId: string,
  userId: string,
  dek: CryptoKey,
  recoveryKey: CryptoKey,
): Promise<void> {
  const dekRaw = await exportDEK(dek);
  const wrapped = await wrapKey(dekRaw, recoveryKey);

  await client.api.projects({ id: projectId })["key-grants"].post({
    userId,
    wrappedDek: wrapped.wrapped,
    wrappedDekIv: wrapped.iv,
    wrappedDekTag: wrapped.tag,
    grantType: "RECOVERY",
  });
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
