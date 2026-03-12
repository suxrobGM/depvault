import type { client } from "@/lib/api";
import type { Data } from "./utils";

type ProjectById = ReturnType<(typeof client)["api"]["projects"]>;

export type CiTokenListResponse = Data<ProjectById["ci-tokens"]["get"]>;
export type CiToken = CiTokenListResponse["items"][number];

export type CiTokenCreatedResponse = Data<ProjectById["ci-tokens"]["post"]>;
export type CreateCiTokenBody = Parameters<ProjectById["ci-tokens"]["post"]>[0];
