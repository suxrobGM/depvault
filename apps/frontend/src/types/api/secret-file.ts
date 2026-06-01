import type { client } from "@/lib/api";
import type { Data } from "./utils";

type ProjectById = ReturnType<typeof client.api.projects>;
type SecretById = ReturnType<ProjectById["secrets"]>;

export type SecretFileListResponseDto = Data<ProjectById["secrets"]["get"]>;
export type SecretFileDto = SecretFileListResponseDto["items"][number];

export type SecretFileVersionListResponseDto = Data<SecretById["versions"]["get"]>;
export type SecretFileVersionDto = SecretFileVersionListResponseDto["items"][number];
