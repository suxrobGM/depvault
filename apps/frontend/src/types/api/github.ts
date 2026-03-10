import type { client } from "@/lib/api";
import type { Data } from "./utils";

type GitHubRepos = (typeof client)["api"]["github"]["repos"];

export type GitHubRepoListResponse = Data<GitHubRepos["get"]>;
export type GitHubRepo = GitHubRepoListResponse["items"][number];

type GitHubRepoByOwner = ReturnType<GitHubRepos>;
type GitHubRepoByOwnerAndRepo = ReturnType<GitHubRepoByOwner>;

export type GitHubDependencyFilesResponse = Data<
  GitHubRepoByOwnerAndRepo["dependency-files"]["get"]
>;
export type GitHubDependencyFile = GitHubDependencyFilesResponse[number];

export type GitHubFileContentResponse = Data<GitHubRepoByOwnerAndRepo["content"]["get"]>;
