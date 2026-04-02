import { decrypt } from "@depvault/crypto";
import { serializeConfig, type ConfigFormat } from "@depvault/shared";
import type { ConfigEntry } from "@depvault/shared/serializers";
import { getApiClient } from "./api-client";

interface PullOptions {
  projectId: string;
  vaultGroupId: string;
  environmentType: string;
  dek: CryptoKey;
  format: ConfigFormat;
}

interface PullResult {
  entries: ConfigEntry[];
  serialized: string;
  count: number;
}

/** Fetches encrypted env vars from the API, decrypts them, and serializes to the requested format. */
export async function pullEnvVars(options: PullOptions): Promise<PullResult> {
  const { projectId, vaultGroupId, environmentType, dek, format } = options;

  const client = getApiClient();
  const { data, error } = await client.api.projects({ id: projectId }).environments.export.get({
    query: { vaultGroupId, environmentType } as any,
  });

  if (error || !data) {
    throw new Error("Failed to export environment variables.");
  }

  const rawEntries = (data as any).entries ?? [];
  const entries: ConfigEntry[] = [];

  for (const entry of rawEntries) {
    const value = await decrypt(entry.encryptedValue, entry.iv, entry.authTag, dek);

    let comment: string | undefined;
    if (entry.encryptedComment && entry.commentIv && entry.commentAuthTag) {
      comment = await decrypt(entry.encryptedComment, entry.commentIv, entry.commentAuthTag, dek);
    }

    entries.push({ key: entry.key, value, comment });
  }

  const serialized = serializeConfig(format, entries);
  return { entries, serialized, count: entries.length };
}
