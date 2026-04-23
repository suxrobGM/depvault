import type { SecretFileResponse } from "./secret-file.schema";

export function toSecretFileResponse(
  file: {
    id: string;
    vaultId: string;
    name: string;
    description: string | null;
    mimeType: string;
    fileSize: number;
    uploadedBy: string;
    createdAt: Date;
    updatedAt: Date;
  },
  vault: { id: string; name: string },
): SecretFileResponse {
  return {
    id: file.id,
    vaultId: vault.id,
    vaultName: vault.name,
    name: file.name,
    description: file.description,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
    uploadedBy: file.uploadedBy,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}
