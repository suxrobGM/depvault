import { encrypt } from "@depvault/crypto";
import type { ConfigFormat, EnvironmentTypeValue } from "@depvault/shared";
import { parseConfig } from "@depvault/shared/parsers";
import { getApiClient } from "./api-client";

interface ImportOptions {
  projectId: string;
  vaultGroupId: string;
  environmentType: EnvironmentTypeValue;
  dek: CryptoKey;
  content: string;
  format: ConfigFormat;
}

interface ImportResult {
  imported: number;
  updated: number;
}

/** Parses a local config file, encrypts each value, and pushes to the API. */
export async function pushEnvVars(options: ImportOptions): Promise<ImportResult> {
  const { projectId, vaultGroupId, environmentType, dek, content, format } = options;

  const entries = parseConfig(format, content);

  const encryptedEntries = await Promise.all(
    entries.map(async (entry, index) => {
      const { ciphertext, iv, authTag } = await encrypt(entry.value, dek);

      let encryptedComment: string | undefined;
      let commentIv: string | undefined;
      let commentAuthTag: string | undefined;

      if (entry.comment) {
        const commentEnc = await encrypt(entry.comment, dek);
        encryptedComment = commentEnc.ciphertext;
        commentIv = commentEnc.iv;
        commentAuthTag = commentEnc.authTag;
      }

      return {
        key: entry.key,
        encryptedValue: ciphertext,
        iv,
        authTag,
        sortOrder: index,
        encryptedComment,
        commentIv,
        commentAuthTag,
      };
    }),
  );

  const client = getApiClient();
  const { data, error } = await client.api.projects({ id: projectId }).environments.import.post({
    vaultGroupId,
    environmentType,
    entries: encryptedEntries,
  });

  if (error || !data) {
    throw new Error("Failed to import environment variables.");
  }

  const result = data as any;
  return { imported: result.imported ?? 0, updated: result.updated ?? 0 };
}
