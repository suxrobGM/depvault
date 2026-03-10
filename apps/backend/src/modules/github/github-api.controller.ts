import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import {
  GitHubDependencyFilesResponseSchema,
  GitHubFileContentQuerySchema,
  GitHubFileContentResponseSchema,
  GitHubRepoListQuerySchema,
  GitHubRepoListResponseSchema,
  GitHubRepoParamsSchema,
} from "./github-api.schema";
import { GitHubApiService } from "./github-api.service";

const githubApiService = container.resolve(GitHubApiService);

export const githubApiController = new Elysia({
  prefix: "/github",
  detail: { tags: ["GitHub"] },
})
  .use(authGuard)
  .get(
    "/repos",
    ({ query, user }) => githubApiService.listRepos(user.id, query.page, query.limit),
    {
      query: GitHubRepoListQuerySchema,
      response: GitHubRepoListResponseSchema,
      detail: {
        summary: "List GitHub repositories",
        description:
          "List the authenticated user's GitHub repositories. Requires a linked GitHub account with repo scope.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/repos/:owner/:repo/dependency-files",
    ({ params, user }) => githubApiService.listDependencyFiles(user.id, params.owner, params.repo),
    {
      params: GitHubRepoParamsSchema,
      response: GitHubDependencyFilesResponseSchema,
      detail: {
        summary: "Discover dependency files",
        description:
          "Scan a GitHub repository for known dependency files (package.json, requirements.txt, etc.). Supports monorepos with nested projects.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/repos/:owner/:repo/content",
    ({ params, query, user }) =>
      githubApiService.getFileContent(user.id, params.owner, params.repo, query.path),
    {
      params: GitHubRepoParamsSchema,
      query: GitHubFileContentQuerySchema,
      response: GitHubFileContentResponseSchema,
      detail: {
        summary: "Get file content",
        description: "Fetch the content of a specific file from a GitHub repository.",
        security: [{ bearerAuth: [] }],
      },
    },
  );
