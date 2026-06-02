import { t, type Static } from "elysia";

export const RepoFileKindSchema = t.UnionEnum(["CONFIG", "SECRET"] as const);

export const AppResponseSchema = t.Object({
  id: t.String(),
  projectId: t.String(),
  name: t.String(),
  appPath: t.String(),
  fileCount: t.Number(),
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

export const RepoMapFileSchema = t.Object({
  id: t.String(),
  kind: RepoFileKindSchema,
  relativePath: t.String(),
  environmentSlug: t.Nullable(t.String()),
  format: t.Nullable(t.String()),
  mimeType: t.Nullable(t.String()),
  fileSize: t.Number(),
  isBinary: t.Boolean(),
  updatedAt: t.Date(),
});

export const RepoMapAppSchema = t.Object({
  id: t.String(),
  name: t.String(),
  appPath: t.String(),
  environments: t.Array(t.String()),
  files: t.Array(RepoMapFileSchema),
});

export const RepoMapResponseSchema = t.Object({
  apps: t.Array(RepoMapAppSchema),
});

export const ExportBodySchema = t.Object({
  appId: t.Optional(t.String()),
  environmentSlug: t.Optional(t.String()),
  fileId: t.Optional(t.String()),
});

export const ExportFileSchema = t.Object({
  kind: RepoFileKindSchema,
  relativePath: t.String(),
  environmentSlug: t.Nullable(t.String()),
  format: t.Nullable(t.String()),
  mimeType: t.Nullable(t.String()),
  encryptedContent: t.String({ description: "Base64-encoded encrypted file content" }),
  iv: t.String(),
  authTag: t.String(),
  isBinary: t.Boolean(),
});

export const ExportResponseSchema = t.Object({
  files: t.Array(ExportFileSchema),
});

export type AppResponse = Static<typeof AppResponseSchema>;
export type AppListResponse = Static<typeof AppListResponseSchema>;
export type CreateAppBody = Static<typeof CreateAppBodySchema>;
export type UpdateAppBody = Static<typeof UpdateAppBodySchema>;
export type AppParams = Static<typeof AppParamsSchema>;
export type RepoMapFile = Static<typeof RepoMapFileSchema>;
export type RepoMapApp = Static<typeof RepoMapAppSchema>;
export type RepoMapResponse = Static<typeof RepoMapResponseSchema>;
export type ExportBody = Static<typeof ExportBodySchema>;
export type ExportFile = Static<typeof ExportFileSchema>;
export type ExportResponse = Static<typeof ExportResponseSchema>;
