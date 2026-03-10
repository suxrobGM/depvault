import type { client } from "@/lib/api";
import type { Data } from "./utils";

type ProjectById = ReturnType<(typeof client)["api"]["projects"]>;

export type ProjectListResponse = Data<(typeof client)["api"]["projects"]["get"]>;
export type Project = ProjectListResponse["items"][number];

export type ProjectResponse = Data<ProjectById["get"]>;

export type MemberListResponse = Data<ProjectById["members"]["get"]>;
export type Member = MemberListResponse["items"][number];

export type ProjectStatsResponse = Data<(typeof client)["api"]["projects"]["stats"]["get"]>;
