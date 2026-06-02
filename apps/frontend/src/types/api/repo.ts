import type { client } from "@/lib/api";
import type { Body, Data, Query } from "./utils";

type ProjectById = ReturnType<typeof client.api.projects>;

type Files = ProjectById["files"];
type FileById = ReturnType<Files>;
type FileVersionById = ReturnType<FileById["versions"]>;

/** Apps grouped under a project. */
export type AppListResponseDto = Data<ProjectById["apps"]["get"]>;
export type AppDto = AppListResponseDto[number];

/** Full repository tree: apps with their config + secret file metadata. */
export type RepoMapResponseDto = Data<ProjectById["repo-map"]["get"]>;
export type RepoMapAppDto = RepoMapResponseDto["apps"][number];
export type RepoMapFileDto = RepoMapAppDto["files"][number];

/** Discriminates a repo file as a config file or a secret file. */
export type RepoFileKind = RepoMapFileDto["kind"];

/** Paginated repo-file metadata. */
export type RepoFileListResponseDto = Data<Files["get"]>;
export type RepoFileDto = RepoFileListResponseDto["items"][number];
export type RepoFileListQuery = Query<Files["get"]>;

/** A single repo file with its decryptable blob. */
export type RepoFileContentDto = Data<FileById["get"]>;

/** Repo-file version metadata list. */
export type RepoFileVersionListResponseDto = Data<FileById["versions"]["get"]>;
export type RepoFileVersionDto = RepoFileVersionListResponseDto["items"][number];

/** A single repo-file version with its decryptable blob. */
export type RepoFileVersionContentDto = Data<FileVersionById["get"]>;

/** Body for saving a new file revision from the web editor. */
export type SaveRepoFileBody = Body<FileById["put"]>;
