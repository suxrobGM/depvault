import type { Data } from "@depvault/shared/api";
import type { client } from "@/api/client";

type GitHubRepos = typeof client.api.github.repos;

export type GitHubRepoListResponseDto = Data<GitHubRepos["get"]>;
export type GitHubRepoDto = GitHubRepoListResponseDto["items"][number];

type GitHubRepoByOwner = ReturnType<GitHubRepos>;
type GitHubRepoByOwnerAndRepo = ReturnType<GitHubRepoByOwner>;

export type GitHubDependencyFilesResponseDto = Data<
  GitHubRepoByOwnerAndRepo["dependency-files"]["get"]
>;
export type GitHubDependencyFileDto = GitHubDependencyFilesResponseDto[number];

export type GitHubFileContentDto = Data<GitHubRepoByOwnerAndRepo["content"]["get"]>;
