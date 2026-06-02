import type { client } from "@/lib/api";
import type { Body, Data, Query } from "./utils";

type ProjectById = ReturnType<typeof client.api.projects>;

type ConfigFiles = ProjectById["config-files"];
type ConfigFileById = ReturnType<ConfigFiles>;
type ConfigFileVersionById = ReturnType<ConfigFileById["versions"]>;

type Secrets = ProjectById["secrets"];
type SecretById = ReturnType<Secrets>;

/** Apps grouped under a project. */
export type AppListResponseDto = Data<ProjectById["apps"]["get"]>;
export type AppDto = AppListResponseDto[number];

/** Full repository tree: apps with their config + secret file metadata. */
export type RepoMapResponseDto = Data<ProjectById["repo-map"]["get"]>;
export type RepoMapAppDto = RepoMapResponseDto["apps"][number];
export type RepoMapConfigFileDto = RepoMapAppDto["configFiles"][number];
export type RepoMapSecretFileDto = RepoMapAppDto["secretFiles"][number];

/** Paginated config-file metadata. */
export type ConfigFileListResponseDto = Data<ConfigFiles["get"]>;
export type ConfigFileListItemDto = ConfigFileListResponseDto["items"][number];

/** A single config file with its decryptable blob. */
export type ConfigFileContentDto = Data<ConfigFileById["get"]>;

/** Config-file version metadata list. */
export type ConfigFileVersionListResponseDto = Data<ConfigFileById["versions"]["get"]>;
export type ConfigFileVersionDto = ConfigFileVersionListResponseDto["items"][number];

/** A single config-file version with its decryptable blob. */
export type ConfigFileVersionContentDto = Data<ConfigFileVersionById["get"]>;

/** Body for saving a new config-file revision from the web editor. */
export type UpdateConfigFileBody = Body<ConfigFileById["put"]>;

/** Paginated secret-file metadata. */
export type SecretFileListResponseDto = Data<Secrets["get"]>;
export type SecretFileDto = SecretFileListResponseDto["items"][number];
export type SecretFileListQuery = Query<Secrets["get"]>;

/** Secret-file download payload (encrypted blob). */
export type SecretFileDownloadDto = Data<SecretById["download"]["get"]>;

/** Body for re-pushing secret-file content. */
export type PushSecretBody = Body<Secrets["push"]["post"]>;
