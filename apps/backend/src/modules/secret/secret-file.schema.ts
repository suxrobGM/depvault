import { t, type Static } from "elysia";
import { PaginationQuerySchema } from "@/types/pagination";
import { PaginatedResponseSchema } from "@/types/response";

const FORBIDDEN_EXTENSIONS = [".exe", ".sh", ".bat", ".cmd", ".ps1"];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export { FORBIDDEN_EXTENSIONS, MAX_FILE_SIZE };

export const SecretFileResponseSchema = t.Object({
  id: t.String(),
  vaultId: t.String(),
  vaultName: t.String(),
  name: t.String(),
  description: t.Nullable(t.String()),
  mimeType: t.String(),
  fileSize: t.Number(),
  uploadedBy: t.String(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

export const SecretFileListQuerySchema = PaginationQuerySchema(t.Object({}));

export const SecretFileListResponseSchema = PaginatedResponseSchema(SecretFileResponseSchema);

export const SecretFileParamsSchema = t.Object({
  id: t.String(),
  fileId: t.String(),
});

export const SecretFileVersionResponseSchema = t.Object({
  id: t.String(),
  secretFileId: t.String(),
  fileSize: t.Number(),
  changedBy: t.String(),
  createdAt: t.Date(),
});

export const SecretFileVersionListResponseSchema = t.Object({
  items: t.Array(SecretFileVersionResponseSchema),
});

export const UploadSecretFileBodySchema = t.Object({
  encryptedContent: t.String({ description: "Base64-encoded encrypted file content" }),
  iv: t.String(),
  authTag: t.String(),
  name: t.String({ minLength: 1, maxLength: 255 }),
  mimeType: t.String(),
  fileSize: t.Number({ minimum: 1, maximum: MAX_FILE_SIZE }),
  vaultId: t.String(),
  description: t.Optional(t.String({ maxLength: 500 })),
});

export const SecretFileRollbackParamsSchema = t.Object({
  id: t.String(),
  fileId: t.String(),
  versionId: t.String(),
});

export const UploadNewVersionBodySchema = t.Object({
  encryptedContent: t.String({ description: "Base64-encoded encrypted file content" }),
  iv: t.String(),
  authTag: t.String(),
  name: t.String({ minLength: 1, maxLength: 255 }),
  mimeType: t.String(),
  fileSize: t.Number({ minimum: 1, maximum: MAX_FILE_SIZE }),
});

export const UpdateSecretFileBodySchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  description: t.Optional(t.String({ maxLength: 500 })),
  vaultId: t.Optional(t.String()),
});

export const SecretFileDownloadResponseSchema = t.Object({
  encryptedContent: t.String({ description: "Base64-encoded encrypted file content" }),
  iv: t.String(),
  authTag: t.String(),
  name: t.String(),
  mimeType: t.String(),
});

export type SecretFileResponse = Static<typeof SecretFileResponseSchema>;
export type SecretFileListQuery = Static<typeof SecretFileListQuerySchema>;
export type SecretFileVersionResponse = Static<typeof SecretFileVersionResponseSchema>;
export type SecretFileDownloadResponse = Static<typeof SecretFileDownloadResponseSchema>;
export type UpdateSecretFileBody = Static<typeof UpdateSecretFileBodySchema>;
export type UploadSecretFileBody = Static<typeof UploadSecretFileBodySchema>;
export type UploadNewVersionBody = Static<typeof UploadNewVersionBodySchema>;
