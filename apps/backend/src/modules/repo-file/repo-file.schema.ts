import { t, type Static } from "elysia";
import { PaginationQuerySchema } from "@/types/pagination";
import { PaginatedResponseSchema } from "@/types/response";

const FORBIDDEN_EXTENSIONS = [".exe", ".sh", ".bat", ".cmd", ".ps1"];
const MAX_CONFIG_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_SECRET_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export { FORBIDDEN_EXTENSIONS, MAX_CONFIG_FILE_SIZE, MAX_SECRET_FILE_SIZE };

export const RepoFileKindSchema = t.UnionEnum(["CONFIG", "SECRET"] as const);

/** Repo file metadata (no encrypted blob). Returned by list and mutation endpoints. */
export const RepoFileResponseSchema = t.Object({
  id: t.String(),
  appId: t.String(),
  appName: t.String(),
  appPath: t.String(),
  kind: RepoFileKindSchema,
  relativePath: t.String(),
  environmentSlug: t.Nullable(t.String()),
  format: t.Nullable(t.String()),
  mimeType: t.Nullable(t.String()),
  description: t.Nullable(t.String()),
  fileSize: t.Number(),
  isBinary: t.Boolean(),
  createdBy: t.String(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

/** Repo file content: metadata plus the client-encrypted blob (base64) and crypto params. */
export const RepoFileContentResponseSchema = t.Composite([
  RepoFileResponseSchema,
  t.Object({
    encryptedContent: t.String({ description: "Base64-encoded encrypted file content" }),
    iv: t.String(),
    authTag: t.String(),
  }),
]);

export const RepoFileVersionResponseSchema = t.Object({
  id: t.String(),
  fileSize: t.Number(),
  isBinary: t.Boolean(),
  changedBy: t.String(),
  message: t.Nullable(t.String()),
  createdAt: t.Date(),
});

export const RepoFileVersionListResponseSchema = t.Object({
  items: t.Array(RepoFileVersionResponseSchema),
});

export const RepoFileListQuerySchema = PaginationQuerySchema(
  t.Object({
    appId: t.Optional(t.String()),
    environmentSlug: t.Optional(t.String()),
    kind: t.Optional(RepoFileKindSchema),
  }),
);

export const RepoFileListResponseSchema = PaginatedResponseSchema(RepoFileResponseSchema);

export const RepoFileParamsSchema = t.Object({
  id: t.String(),
  fileId: t.String(),
});

export const RepoFileVersionParamsSchema = t.Object({
  id: t.String(),
  fileId: t.String(),
  versionId: t.String(),
});

/**
 * Push a repo file from the CLI: upserts the owning app, then creates or replaces the file
 * (keyed by `(projectId, relativePath)`, snapshotting the prior content as a version). `kind`
 * decides which optional metadata applies — `format` for CONFIG, `mimeType` for SECRET.
 */
export const PushRepoFileBodySchema = t.Object({
  appPath: t.String({ minLength: 1, maxLength: 1024 }),
  appName: t.String({ minLength: 1, maxLength: 255 }),
  kind: RepoFileKindSchema,
  relativePath: t.String({ minLength: 1, maxLength: 1024 }),
  environmentSlug: t.Optional(t.Nullable(t.String({ maxLength: 255 }))),
  format: t.Optional(t.Nullable(t.String({ maxLength: 64 }))),
  mimeType: t.Optional(t.Nullable(t.String({ maxLength: 255 }))),
  description: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
  encryptedContent: t.String({ description: "Base64-encoded encrypted file content" }),
  iv: t.String(),
  authTag: t.String(),
  fileSize: t.Number({ minimum: 0, maximum: MAX_SECRET_FILE_SIZE }),
  isBinary: t.Boolean({ default: false }),
});

/** Save an edited file from the web app: replaces content, snapshotting the prior version. */
export const SaveRepoFileBodySchema = t.Object({
  encryptedContent: t.String({ description: "Base64-encoded encrypted file content" }),
  iv: t.String(),
  authTag: t.String(),
  fileSize: t.Number({ minimum: 0, maximum: MAX_SECRET_FILE_SIZE }),
  isBinary: t.Boolean({ default: false }),
  message: t.Optional(t.String({ maxLength: 500 })),
});

/** Update file metadata only (never moves the file across apps or paths). */
export const UpdateRepoFileBodySchema = t.Object({
  description: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
  environmentSlug: t.Optional(t.Nullable(t.String({ maxLength: 255 }))),
});

export type RepoFileResponse = Static<typeof RepoFileResponseSchema>;
export type RepoFileContentResponse = Static<typeof RepoFileContentResponseSchema>;
export type RepoFileVersionListResponse = Static<typeof RepoFileVersionListResponseSchema>;
export type RepoFileListQuery = Static<typeof RepoFileListQuerySchema>;
export type PushRepoFileBody = Static<typeof PushRepoFileBodySchema>;
export type SaveRepoFileBody = Static<typeof SaveRepoFileBodySchema>;
export type UpdateRepoFileBody = Static<typeof UpdateRepoFileBodySchema>;
