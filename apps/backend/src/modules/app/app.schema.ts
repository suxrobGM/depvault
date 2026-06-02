import { t, type Static } from "elysia";

export const AppResponseSchema = t.Object({
  id: t.String(),
  projectId: t.String(),
  name: t.String(),
  appPath: t.String(),
  configFileCount: t.Number(),
  secretFileCount: t.Number(),
  environments: t.Array(t.String()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

export const AppListResponseSchema = t.Array(AppResponseSchema);

export const CreateAppBodySchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  appPath: t.String({ minLength: 1, maxLength: 1024 }),
});

export const UpdateAppBodySchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
});

export const AppParamsSchema = t.Object({
  id: t.String(),
  appId: t.String(),
});

export const RepoMapConfigFileSchema = t.Object({
  id: t.String(),
  relativePath: t.String(),
  format: t.String(),
  environmentSlug: t.String(),
  fileSize: t.Number(),
  isBinary: t.Boolean(),
  updatedAt: t.Date(),
});

export const RepoMapSecretFileSchema = t.Object({
  id: t.String(),
  relativePath: t.String(),
  environmentSlug: t.Nullable(t.String()),
  mimeType: t.String(),
  fileSize: t.Number(),
  isBinary: t.Boolean(),
  updatedAt: t.Date(),
});

export const RepoMapAppSchema = t.Object({
  id: t.String(),
  name: t.String(),
  appPath: t.String(),
  environments: t.Array(t.String()),
  configFiles: t.Array(RepoMapConfigFileSchema),
  secretFiles: t.Array(RepoMapSecretFileSchema),
});

export const RepoMapResponseSchema = t.Object({
  apps: t.Array(RepoMapAppSchema),
});

export const ExportBodySchema = t.Object({
  appId: t.Optional(t.String()),
  environmentSlug: t.Optional(t.String()),
  fileId: t.Optional(t.String()),
});

export const ExportConfigFileSchema = t.Object({
  relativePath: t.String(),
  format: t.String(),
  environmentSlug: t.String(),
  encryptedContent: t.String({ description: "Base64-encoded encrypted file content" }),
  iv: t.String(),
  authTag: t.String(),
  isBinary: t.Boolean(),
});

export const ExportSecretFileSchema = t.Object({
  relativePath: t.String(),
  environmentSlug: t.Nullable(t.String()),
  mimeType: t.String(),
  encryptedContent: t.String({ description: "Base64-encoded encrypted file content" }),
  iv: t.String(),
  authTag: t.String(),
  isBinary: t.Boolean(),
});

export const ExportResponseSchema = t.Object({
  configFiles: t.Array(ExportConfigFileSchema),
  secretFiles: t.Array(ExportSecretFileSchema),
});

export type AppResponse = Static<typeof AppResponseSchema>;
export type AppListResponse = Static<typeof AppListResponseSchema>;
export type CreateAppBody = Static<typeof CreateAppBodySchema>;
export type UpdateAppBody = Static<typeof UpdateAppBodySchema>;
export type AppParams = Static<typeof AppParamsSchema>;
export type RepoMapConfigFile = Static<typeof RepoMapConfigFileSchema>;
export type RepoMapSecretFile = Static<typeof RepoMapSecretFileSchema>;
export type RepoMapApp = Static<typeof RepoMapAppSchema>;
export type RepoMapResponse = Static<typeof RepoMapResponseSchema>;
export type ExportBody = Static<typeof ExportBodySchema>;
export type ExportConfigFile = Static<typeof ExportConfigFileSchema>;
export type ExportSecretFile = Static<typeof ExportSecretFileSchema>;
export type ExportResponse = Static<typeof ExportResponseSchema>;
