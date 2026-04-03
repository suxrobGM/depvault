import { decryptBinary, fromBase64 } from "@depvault/crypto";
import { getApiClient } from "./api-client";

interface SecretFileResult {
  name: string;
  content: ArrayBuffer;
}

/** Downloads and decrypts a secret file. */
export async function pullSecretFile(
  projectId: string,
  fileId: string,
  dek: CryptoKey,
): Promise<SecretFileResult> {
  const client = getApiClient();
  const { data, error } = await client.api
    .projects({ id: projectId })
    .secrets({ fileId })
    .download.get();

  if (error || !data) {
    throw new Error(`Failed to download secret file ${fileId}.`);
  }

  const file = data;
  const content = await decryptBinary(file.encryptedContent, file.iv, file.authTag, dek);

  return { name: file.name, content };
}

/** Lists all secret files for a project (metadata only). */
export async function listSecretFiles(projectId: string) {
  const client = getApiClient();
  const { data, error } = await client.api
    .projects({ id: projectId })
    .secrets.get({ query: { page: 1, limit: 100 } });

  if (error || !data) {
    throw new Error("Failed to list secret files.");
  }

  return (data.items ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    vaultGroupName: s.vaultGroupName,
    fileSize: s.fileSize,
    mimeType: s.mimeType,
    createdAt: s.createdAt,
  }));
}
