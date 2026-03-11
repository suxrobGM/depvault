import type { client } from "@/lib/api";
import type { Data } from "./utils";

type ProjectById = ReturnType<(typeof client)["api"]["projects"]>;

export type EnvTemplateListResponse = Data<ProjectById["env-templates"]["get"]>;
export type EnvTemplateItem = EnvTemplateListResponse[number];

type TemplateById = ReturnType<ProjectById["env-templates"]>;
export type EnvTemplateDetailResponse = Data<TemplateById["get"]>;
export type EnvTemplateVariable = EnvTemplateDetailResponse["variables"][number];
