import { singleton } from "tsyringe";
import { BadRequestError, UnauthorizedError } from "@/common/errors";
import { logger } from "@/common/logger";
import { PrismaClient, type Ecosystem } from "@/generated/prisma";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  description: string | null;
  language: string | null;
  updated_at: string;
}

interface GitHubTreeResponse {
  sha: string;
  tree: Array<{
    path: string;
    mode: string;
    type: string;
    size?: number;
  }>;
  truncated: boolean;
}

interface GitHubContentResponse {
  content: string;
  encoding: string;
  name: string;
  path: string;
  size: number;
}

const DEPENDENCY_FILES: Record<string, Ecosystem> = {
  "package.json": "NODEJS",
  "requirements.txt": "PYTHON",
  "pyproject.toml": "PYTHON",
};

const DEPENDENCY_FILE_NAMES = new Set(Object.keys(DEPENDENCY_FILES));

@singleton()
export class GitHubApiService {
  constructor(private readonly prisma: PrismaClient) {}

  async listRepos(userId: string, page: number, limit: number) {
    const token = await this.getToken(userId);

    const params = new URLSearchParams({
      per_page: limit.toString(),
      page: page.toString(),
      sort: "updated",
      direction: "desc",
    });

    const response = await this.githubFetch(`https://api.github.com/user/repos?${params}`, token);

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

    const repoResponse = await this.githubFetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      token,
    );
    const repoData = (await repoResponse.json()) as GitHubRepo;

    const treeResponse = await this.githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${repoData.default_branch}?recursive=1`,
      token,
    );
    const treeData = (await treeResponse.json()) as GitHubTreeResponse;

    return treeData.tree
      .filter((item) => {
        if (item.type !== "blob") return false;
        const fileName = item.path.split("/").pop() ?? "";
        return DEPENDENCY_FILE_NAMES.has(fileName);
      })
      .map((item) => {
        const fileName = item.path.split("/").pop()!;
        return {
          path: item.path,
          name: fileName,
          ecosystem: DEPENDENCY_FILES[fileName]!,
        };
      });
  }

  async getFileContent(userId: string, owner: string, repo: string, path: string) {
    if (path.includes("..")) {
      throw new BadRequestError("Invalid file path");
    }

    const token = await this.getToken(userId);

    const response = await this.githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
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

  private async githubFetch(url: string, token: string): Promise<Response> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
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
