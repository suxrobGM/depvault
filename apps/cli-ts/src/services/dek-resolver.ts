import { deriveCIWrapKey, deriveKEK, fromBase64, importDEK, unwrapKey } from "@depvault/crypto";
import { CI_TOKEN_ENV_VAR, VAULT_PASSWORD_ENV_VAR } from "@/constants";
import { getApiClient } from "./api-client";

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
    throw new Error("Vault is locked. Use /unlock in REPL mode, or set DEPVAULT_PASSWORD env var.");
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

  if (error || !grant) {
    throw new Error(
      "No key grant found for this project. Unlock your vault in the web dashboard to generate a key grant.",
    );
  }

  const dekRaw = await unwrapKey(grant.wrappedDek, grant.wrappedDekIv, grant.wrappedDekTag, kek);
  return importDEK(dekRaw);
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
