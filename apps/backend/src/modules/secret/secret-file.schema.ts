import { t, type Static } from "elysia";
import { PaginationQuerySchema } from "@/types/pagination";
import { PaginatedResponseSchema } from "@/types/response";

const FORBIDDEN_EXTENSIONS = [".exe", ".sh", ".bat", ".cmd", ".ps1"];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export { FORBIDDEN_EXTENSIONS, MAX_FILE_SIZE };

export const SecretFileResponseSchema = t.Object({
  id: t.String(),
  appId: t.String(),
  appName: t.String(),
  appPath: t.String(),
  relativePath: t.String(),
  environmentSlug: t.Nullable(t.String()),
  description: t.Nullable(t.String()),
  mimeType: t.String(),
  fileSize: t.Number(),
  isBinary: t.Boolean(),
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

export const SecretFileRollbackParamsSchema = t.Object({
  id: t.String(),
  fileId: t.String(),
  versionId: t.String(),
});

export const SecretFileVersionResponseSchema = t.Object({
  id: t.String(),
  secretFileId: t.String(),
  fileSize: t.Number(),
  isBinary: t.Boolean(),
  changedBy: t.String(),
  message: t.Nullable(t.String()),
  createdAt: t.Date(),
});

export const SecretFileVersionListResponseSchema = t.Object({
  items: t.Array(SecretFileVersionResponseSchema),
});

export const PushSecretFileBodySchema = t.Object({
  appPath: t.String({ minLength: 1, maxLength: 1024 }),
  appName: t.String({ minLength: 1, maxLength: 255 }),
  relativePath: t.String({ minLength: 1, maxLength: 1024 }),
  environmentSlug: t.Optional(t.String({ maxLength: 255 })),
  encryptedContent: t.String({ description: "Base64-encoded encrypted file content" }),
  iv: t.String(),
  authTag: t.String(),
  mimeType: t.String({ maxLength: 255 }),
  fileSize: t.Number({ minimum: 1, maximum: MAX_FILE_SIZE }),
  isBinary: t.Boolean(),
  description: t.Optional(t.String({ maxLength: 500 })),
});

export const UpdateSecretFileBodySchema = t.Object({
  description: t.Optional(t.String({ maxLength: 500 })),
  environmentSlug: t.Optional(t.String({ maxLength: 255 })),
});

export const SecretFileDownloadResponseSchema = t.Object({
  encryptedContent: t.String({ description: "Base64-encoded encrypted file content" }),
  iv: t.String(),
  authTag: t.String(),
  relativePath: t.String(),
  mimeType: t.String(),
});

export type SecretFileResponse = Static<typeof SecretFileResponseSchema>;
export type SecretFileListQuery = Static<typeof SecretFileListQuerySchema>;
export type SecretFileVersionResponse = Static<typeof SecretFileVersionResponseSchema>;
export type SecretFileDownloadResponse = Static<typeof SecretFileDownloadResponseSchema>;
export type PushSecretFileBody = Static<typeof PushSecretFileBodySchema>;
export type UpdateSecretFileBody = Static<typeof UpdateSecretFileBodySchema>;
