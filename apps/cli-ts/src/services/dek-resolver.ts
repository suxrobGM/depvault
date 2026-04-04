import {
  deriveCIWrapKey,
  deriveKEK,
  exportDEK,
  fromBase64,
  generateDEK,
  importDEK,
  unwrapKey,
  wrapKey,
} from "@depvault/crypto";
import { CI_TOKEN_ENV_VAR, VAULT_PASSWORD_ENV_VAR } from "@/constants";
import { getApiClient } from "./api-client";
import { loadCredentials } from "./credentials";

/**
 * Resolves the project DEK (Data Encryption Key).
 * - CI mode: derives wrap key from DEPVAULT_TOKEN via HKDF, unwraps DEK from CI secrets endpoint
 * - JWT mode: derives KEK from vault password via PBKDF2, unwraps DEK from user's key grant
 */
export async function resolveDek(projectId: string, kek: CryptoKey | null): Promise<CryptoKey> {
  const ciToken = process.env[CI_TOKEN_ENV_VAR];

  if (ciToken) {
    return resolveDekFromCiToken(ciToken);
  }

  if (kek) {
    return resolveDekFromKek(projectId, kek);
  }

  // One-shot mode: derive KEK from vault password
  const password = process.env[VAULT_PASSWORD_ENV_VAR];
  if (!password) {
    throw new Error(
      `Vault is locked. Use /unlock in REPL mode, or set ${VAULT_PASSWORD_ENV_VAR} env var.`,
    );
  }

  const derivedKek = await deriveKekFromPassword(password);
  return resolveDekFromKek(projectId, derivedKek);
}

/** Derive KEK from a vault password by fetching the salt from the vault status endpoint. */
export async function deriveKekFromPassword(password: string): Promise<CryptoKey> {
  const client = getApiClient();
  const { data: status, error } = await client.api.vault.status.get();

  if (error) {
    const errorValue = error.value as { message?: string; code?: number } | undefined;
    if (errorValue?.code === 401 || errorValue?.code === 404) {
      throw new Error(
        "Authentication failed. Your session may have expired — run /login to re-authenticate.",
      );
    }
    throw new Error(`Failed to fetch vault status: ${errorValue?.message ?? "Unknown error"}`);
  }

  if (!status?.hasVault || !status.kekSalt || !status.kekIterations) {
    throw new Error("Vault not set up. Set up your vault in the web dashboard first.");
  }

  const salt = fromBase64(status.kekSalt);
  return deriveKEK(password, salt, status.kekIterations);
}

async function resolveDekFromKek(projectId: string, kek: CryptoKey): Promise<CryptoKey> {
  const client = getApiClient();
  const { data: grant, error } = await client.api.projects({ id: projectId }).keygrants.my.get();

  if (grant) {
    const dekRaw = await unwrapKey(grant.wrappedDek, grant.wrappedDekIv, grant.wrappedDekTag, kek);
    return importDEK(dekRaw);
  }

  // Check if this is a 404 (no grant) vs a real error
  const is404 = error && error.value.message?.includes("No key grant");

  if (!is404) {
    throw new Error(error.value.message ?? "Failed to fetch key grant.");
  }

  // Auto-create a SELF grant: generate DEK, wrap with KEK, store on server
  return createSelfGrant(projectId, kek);
}

/** Generate a new DEK, wrap it with the user's KEK, and POST a SELF grant. */
async function createSelfGrant(projectId: string, kek: CryptoKey): Promise<CryptoKey> {
  const creds = loadCredentials();
  if (!creds) {
    throw new Error("Not authenticated. Run /login first.");
  }

  const dek = await generateDEK();
  const dekRaw = await exportDEK(dek);
  const wrapped = await wrapKey(dekRaw, kek);

  const client = getApiClient();
  const { error } = await client.api.projects({ id: projectId }).keygrants.post({
    userId: creds.userId,
    wrappedDek: wrapped.wrapped,
    wrappedDekIv: wrapped.iv,
    wrappedDekTag: wrapped.tag,
    grantType: "SELF",
  });

  if (error) {
    const errorValue = error.value as { message?: string } | undefined;
    throw new Error(errorValue?.message ?? "Failed to create key grant for this project.");
  }

  return dek;
}

async function resolveDekFromCiToken(ciToken: string): Promise<CryptoKey> {
  const client = getApiClient();
  const { data, error } = await client.api.ci.secrets.get();

  if (error || !data) {
    throw new Error("Failed to fetch CI secrets. Check your DEPVAULT_TOKEN.");
  }

  const ciWrapKey = await deriveCIWrapKey(ciToken);
  const dekRaw = await unwrapKey(
    data.wrappedDek!,
    data.wrappedDekIv!,
    data.wrappedDekTag!,
    ciWrapKey,
  );
  return importDEK(dekRaw);
}
