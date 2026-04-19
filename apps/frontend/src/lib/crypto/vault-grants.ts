/** Project-level key grant operations: resolve, create SELF/RECOVERY/ECDH grants. */

import {
  deriveSharedKey,
  exportDEK,
  generateDEK,
  importDEK,
  unwrapKey,
  wrapKey,
} from "@depvault/crypto";
import { client } from "@/lib/api";
import { KeyGrantMismatchError, KeyGrantMissingError } from "./errors";

/**
 * Fetches and unwraps a project's DEK from the user's key grant.
 *
 * Throws {@link KeyGrantMissingError} when the server has no grant for this user/project
 * (HTTP 404), and {@link KeyGrantMismatchError} when the grant exists but AES-GCM unwrap
 * fails (wrong wrapping key — typically means the grant was written under a stale KEK or
 * by a different password). All other errors propagate.
 */
export async function resolveProjectDEK(
  projectId: string,
  kek: CryptoKey,
  privateKey: CryptoKey | null,
): Promise<CryptoKey> {
  const { data: grant, error } = await client.api.projects({ id: projectId }).keygrants.my.get();

  if (error) {
    // The endpoint's response schema only declares the success shape, so Eden Treaty's
    // inferred error type doesn't include 404 — but the backend throws NotFoundError
    // (HTTP 404) when the grant is absent, so match by numeric status.
    if ((error.status as number) === 404) {
      throw new KeyGrantMissingError(projectId);
    }
    throw new Error(`Failed to fetch key grant: ${String(error.value)}`);
  }

  if (!grant) {
    throw new KeyGrantMissingError(projectId);
  }

  let dekRaw: Uint8Array;
  try {
    if (grant.grantType === "SELF") {
      dekRaw = await unwrapKey(grant.wrappedDek, grant.wrappedDekIv, grant.wrappedDekTag, kek);
    } else if (grant.grantType === "ECDH" && grant.granterPublicKey) {
      if (!privateKey) {
        throw new Error("Private key not available");
      }

      const sharedKey = await deriveSharedKey(privateKey, grant.granterPublicKey);
      dekRaw = await unwrapKey(
        grant.wrappedDek,
        grant.wrappedDekIv,
        grant.wrappedDekTag,
        sharedKey,
      );
    } else {
      throw new Error(`Unsupported grant type: ${grant.grantType}`);
    }
  } catch (cause) {
    if (cause instanceof Error && cause.name === "OperationError") {
      throw new KeyGrantMismatchError(projectId, cause);
    }
    // WebCrypto AES-GCM decryption failures surface as DOMException / generic Error without
    // a stable name across browsers; treat any thrown unwrap failure as a mismatch.
    if (grant.grantType === "SELF" || grant.grantType === "ECDH") {
      throw new KeyGrantMismatchError(projectId, cause);
    }
    throw cause;
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

  await client.api.projects({ id: projectId }).keygrants.post({
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

  await client.api.projects({ id: projectId }).keygrants.post({
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

  await client.api.projects({ id: projectId }).keygrants.post({
    userId: recipientUserId,
    wrappedDek: wrapped.wrapped,
    wrappedDekIv: wrapped.iv,
    wrappedDekTag: wrapped.tag,
    granterPublicKey,
    grantType: "ECDH",
  });
}
