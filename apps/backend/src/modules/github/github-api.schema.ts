import { t, type Static } from "elysia";
import { Ecosystem } from "@/generated/prisma";

const EcosystemEnum = t.Enum(Ecosystem);

export const GitHubRepoSchema = t.Object({
  id: t.Number(),
  name: t.String(),
  fullName: t.String(),
  isPrivate: t.Boolean(),
  defaultBranch: t.String(),
  description: t.Nullable(t.String()),
  language: t.Nullable(t.String()),
  updatedAt: t.String(),
});

export const GitHubRepoListResponseSchema = t.Object({
  items: t.Array(GitHubRepoSchema),
});

export const GitHubDependencyFileSchema = t.Object({
  path: t.String(),
  name: t.String(),
  ecosystem: EcosystemEnum,
});

export const GitHubDependencyFilesResponseSchema = t.Array(GitHubDependencyFileSchema);

export const GitHubFileContentResponseSchema = t.Object({
  content: t.String(),
  fileName: t.String(),
});

export const GitHubRepoListQuerySchema = t.Object({
  page: t.Integer({ minimum: 1, default: 1 }),
  limit: t.Integer({ minimum: 1, maximum: 100, default: 30 }),
});

export const GitHubRepoParamsSchema = t.Object({
  owner: t.String(),
  repo: t.String(),
});

export const GitHubFileContentQuerySchema = t.Object({
  path: t.String({ minLength: 1 }),
});

export type GitHubRepoListQuery = Static<typeof GitHubRepoListQuerySchema>;
export type GitHubRepoParams = Static<typeof GitHubRepoParamsSchema>;
export type GitHubFileContentQuery = Static<typeof GitHubFileContentQuerySchema>;
