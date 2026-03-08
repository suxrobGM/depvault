import type { client } from "@/lib/api";
import type { Data } from "./utils";

type ProjectById = ReturnType<(typeof client)["api"]["projects"]>;

export type SecretFileListResponse = Data<ProjectById["secrets"]["get"]>;
export type SecretFile = SecretFileListResponse["items"][number];

type SecretById = ReturnType<ProjectById["secrets"]>;

export type SecretFileVersionListResponse = Data<SecretById["versions"]["get"]>;
export type SecretFileVersion = SecretFileVersionListResponse["items"][number];
