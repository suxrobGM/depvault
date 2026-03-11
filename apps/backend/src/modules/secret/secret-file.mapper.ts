import type { SecretFileResponse } from "./secret-file.schema";

export function toSecretFileResponse(
  file: {
    id: string;
    environmentId: string;
    name: string;
    description: string | null;
    mimeType: string;
    fileSize: number;
    uploadedBy: string;
    createdAt: Date;
    updatedAt: Date;
  },
  vaultGroup: { id: string; name: string },
): SecretFileResponse {
  return {
    id: file.id,
    environmentId: file.environmentId,
    vaultGroupId: vaultGroup.id,
    vaultGroupName: vaultGroup.name,
    name: file.name,
    description: file.description,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
    uploadedBy: file.uploadedBy,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}
