import { DEPENDENCY_EXTENSION_PATTERNS, DEPENDENCY_FILE_MAP } from "@depvault/shared/constants";
import { singleton } from "tsyringe";
import { BadRequestError, UnauthorizedError } from "@/common/errors";
import { logger } from "@/common/logger";
import { PrismaClient } from "@/generated/prisma";
import type {
  GitHubCommit,
  GitHubContentResponse,
  GitHubRepo,
  GitHubTreeResponse,
} from "./github-api.types";

const DEPENDENCY_FILE_NAMES = new Set(Object.keys(DEPENDENCY_FILE_MAP));

@singleton()
export class GitHubApiService {
  private readonly baseUrl = "https://api.github.com";

  constructor(private readonly prisma: PrismaClient) {}

  async listRepos(userId: string, page: number, limit: number) {
    const token = await this.getToken(userId);

    const params = new URLSearchParams({
      per_page: limit.toString(),
      page: page.toString(),
      sort: "updated",
      direction: "desc",
    });

    const response = await this.githubFetch(`${this.baseUrl}/user/repos?${params}`, token);

    const repos = (await response.json()) as GitHubRepo[];

    return {
      items: repos.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        isPrivate: r.private,
        defaultBranch: r.default_branch,
        description: r.description,
        language: r.language,
        updatedAt: r.updated_at,
      })),
    };
  }

  async listDependencyFiles(userId: string, owner: string, repo: string) {
    const token = await this.getToken(userId);

    const repoResponse = await this.githubFetch(`${this.baseUrl}/repos/${owner}/${repo}`, token);
    const repoData = (await repoResponse.json()) as GitHubRepo;

    const treeResponse = await this.githubFetch(
      `${this.baseUrl}/repos/${owner}/${repo}/git/trees/${repoData.default_branch}?recursive=1`,
      token,
    );
    const treeData = (await treeResponse.json()) as GitHubTreeResponse;

    return treeData.tree
      .filter((item) => item.type === "blob")
      .map((item) => {
        const fileName = item.path.split("/").pop() ?? "";
        if (DEPENDENCY_FILE_NAMES.has(fileName)) {
          return { path: item.path, name: fileName, ecosystem: DEPENDENCY_FILE_MAP[fileName]! };
        }
        const extMatch = DEPENDENCY_EXTENSION_PATTERNS.find((e) =>
          fileName.toLowerCase().endsWith(e.ext),
        );
        if (extMatch) {
          return { path: item.path, name: fileName, ecosystem: extMatch.ecosystem };
        }
        return null;
      })
      .filter((item) => item !== null);
  }

  async getFileContent(userId: string, owner: string, repo: string, path: string) {
    if (path.includes("..")) {
      throw new BadRequestError("Invalid file path");
    }

    const token = await this.getToken(userId);

    const response = await this.githubFetch(
      `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`,
      token,
    );

    const data = (await response.json()) as GitHubContentResponse | GitHubContentResponse[];

    if (Array.isArray(data)) {
      throw new BadRequestError("Path points to a directory, not a file");
    }

    if (data.encoding !== "base64" || !data.content) {
      throw new BadRequestError("Unable to read file content");
    }

    const content = Buffer.from(data.content, "base64").toString("utf-8");
    const fileName = data.path.split("/").pop() ?? data.name;

    return { content, fileName };
  }

  async listCommits(userId: string, owner: string, repo: string, perPage = 100, page = 1) {
    const token = await this.getToken(userId);

    const params = new URLSearchParams({
      per_page: perPage.toString(),
      page: page.toString(),
    });

    const response = await this.githubFetch(
      `${this.baseUrl}/repos/${owner}/${repo}/commits?${params}`,
      token,
    );

    const commits = (await response.json()) as GitHubCommit[];

    return commits.map((c) => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.commit.author.name,
      date: c.commit.author.date,
    }));
  }

  async getCommitDiff(userId: string, owner: string, repo: string, sha: string): Promise<string> {
    const token = await this.getToken(userId);

    const response = await this.githubFetch(
      `${this.baseUrl}/repos/${owner}/${repo}/commits/${sha}`,
      token,
      "application/vnd.github.diff",
    );

    return response.text();
  }

  private async getToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { githubAccessToken: true },
    });

    if (!user?.githubAccessToken) {
      throw new BadRequestError(
        "GitHub account not linked. Please link your GitHub account first.",
      );
    }

    return user.githubAccessToken;
  }

  private async githubFetch(
    url: string,
    token: string,
    accept = "application/vnd.github+json",
  ): Promise<Response> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: accept,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (response.status === 401) {
      throw new UnauthorizedError(
        "GitHub token expired or revoked. Please re-link your GitHub account.",
      );
    }

    if (response.status === 403) {
      throw new UnauthorizedError(
        "Insufficient GitHub permissions. Please re-link your GitHub account to grant repository access.",
      );
    }

    if (!response.ok) {
      logger.warn({ url, status: response.status }, "GitHub API request failed");
      throw new BadRequestError(`GitHub API error: ${response.statusText}`);
    }

    return response;
  }
}
