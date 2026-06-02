import { t, type Static } from "elysia";
import { PaginationQuerySchema } from "@/types/pagination";
import { PaginatedResponseSchema } from "@/types/response";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export { MAX_FILE_SIZE };

/**
 * Config file metadata (no encrypted blob). Returned by list and mutation endpoints.
 */
export const ConfigFileResponseSchema = t.Object({
  id: t.String(),
  appId: t.String(),
  relativePath: t.String(),
  format: t.String(),
  environmentSlug: t.String(),
  fileSize: t.Number(),
  isBinary: t.Boolean(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

/**
 * Config file content: metadata plus the client-encrypted blob (base64) and crypto params.
 */
export const ConfigFileContentResponseSchema = t.Composite([
  ConfigFileResponseSchema,
  t.Object({
    encryptedContent: t.String({ description: "Base64-encoded encrypted file content" }),
    iv: t.String(),
    authTag: t.String(),
  }),
]);

export const ConfigFileVersionResponseSchema = t.Object({
  id: t.String(),
  fileSize: t.Number(),
  isBinary: t.Boolean(),
  changedBy: t.String(),
  message: t.Nullable(t.String()),
  createdAt: t.Date(),
});

export const ConfigFileVersionListResponseSchema = t.Object({
  items: t.Array(ConfigFileVersionResponseSchema),
});

export const ConfigFileListQuerySchema = PaginationQuerySchema(
  t.Object({
    appId: t.Optional(t.String()),
    environmentSlug: t.Optional(t.String()),
  }),
);

export const ConfigFileListResponseSchema = PaginatedResponseSchema(ConfigFileResponseSchema);

export const ConfigFileParamsSchema = t.Object({
  id: t.String(),
  fileId: t.String(),
});

export const ConfigFileVersionParamsSchema = t.Object({
  id: t.String(),
  fileId: t.String(),
  versionId: t.String(),
});

/**
 * Push a config file from the CLI: upserts the owning app, then creates or updates the file.
 */
export const PushConfigFileBodySchema = t.Object({
  appPath: t.String({ minLength: 1, maxLength: 1024 }),
  appName: t.String({ minLength: 1, maxLength: 255 }),
  relativePath: t.String({ minLength: 1, maxLength: 1024 }),
  format: t.String({ minLength: 1, maxLength: 64 }),
  environmentSlug: t.String({ minLength: 1, maxLength: 128 }),
  encryptedContent: t.String({ description: "Base64-encoded encrypted file content" }),
  iv: t.String(),
  authTag: t.String(),
  fileSize: t.Number({ minimum: 0, maximum: MAX_FILE_SIZE }),
  isBinary: t.Boolean({ default: false }),
});

/**
 * Save an edited config file from the web app: replaces content, snapshotting the prior version.
 */
export const SaveConfigFileBodySchema = t.Object({
  encryptedContent: t.String({ description: "Base64-encoded encrypted file content" }),
  iv: t.String(),
  authTag: t.String(),
  fileSize: t.Number({ minimum: 0, maximum: MAX_FILE_SIZE }),
  isBinary: t.Boolean({ default: false }),
  message: t.Optional(t.String({ maxLength: 500 })),
});

export type ConfigFileResponse = Static<typeof ConfigFileResponseSchema>;
export type ConfigFileContentResponse = Static<typeof ConfigFileContentResponseSchema>;
export type ConfigFileVersionResponse = Static<typeof ConfigFileVersionResponseSchema>;
export type ConfigFileVersionListResponse = Static<typeof ConfigFileVersionListResponseSchema>;
export type ConfigFileListQuery = Static<typeof ConfigFileListQuerySchema>;
export type ConfigFileParams = Static<typeof ConfigFileParamsSchema>;
export type ConfigFileVersionParams = Static<typeof ConfigFileVersionParamsSchema>;
export type PushConfigFileBody = Static<typeof PushConfigFileBodySchema>;
export type SaveConfigFileBody = Static<typeof SaveConfigFileBodySchema>;
