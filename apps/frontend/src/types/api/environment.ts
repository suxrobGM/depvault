import type { client } from "@/lib/api";
import type { Data } from "./utils";

type ProjectById = ReturnType<(typeof client)["api"]["projects"]>;

export type EnvironmentListResponse = Data<ProjectById["environments"]["get"]>;
export type EnvironmentItem = EnvironmentListResponse[number];
