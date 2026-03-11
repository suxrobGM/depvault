import { t, type Static } from "elysia";

const FORBIDDEN_EXTENSIONS = [".exe", ".sh", ".bat", ".cmd", ".ps1"];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export { FORBIDDEN_EXTENSIONS, MAX_FILE_SIZE };

export const SecretFileResponseSchema = t.Object({
  id: t.String(),
  environmentId: t.String(),
  name: t.String(),
  description: t.Nullable(t.String()),
  mimeType: t.String(),
  fileSize: t.Number(),
  uploadedBy: t.String(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

export const SecretFileListQuerySchema = t.Object({
  environment: t.Optional(t.String()),
  page: t.Integer({ minimum: 1, default: 1 }),
  limit: t.Integer({ minimum: 1, maximum: 100, default: 20 }),
});

export const SecretFileListResponseSchema = t.Object({
  items: t.Array(SecretFileResponseSchema),
  pagination: t.Object({
    page: t.Number(),
    limit: t.Number(),
    total: t.Number(),
    totalPages: t.Number(),
  }),
});

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
  file: t.File({ maxSize: "25m" }),
  vaultGroupId: t.String(),
  environment: t.String({ minLength: 1 }),
  description: t.Optional(t.String({ maxLength: 500 })),
});

export const SecretFileRollbackParamsSchema = t.Object({
  id: t.String(),
  fileId: t.String(),
  versionId: t.String(),
});

export const UpdateSecretFileBodySchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  description: t.Optional(t.String({ maxLength: 500 })),
  vaultGroupId: t.Optional(t.String()),
  environment: t.Optional(t.String({ minLength: 1 })),
});

export type SecretFileResponse = Static<typeof SecretFileResponseSchema>;
export type SecretFileListQuery = Static<typeof SecretFileListQuerySchema>;
export type SecretFileVersionResponse = Static<typeof SecretFileVersionResponseSchema>;
export type UpdateSecretFileBody = Static<typeof UpdateSecretFileBodySchema>;
