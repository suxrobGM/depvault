import type { client } from "@/lib/api";
import type { Body, Data } from "./utils";

type ProjectById = ReturnType<typeof client.api.projects>;

export type CiTokenListResponseDto = Data<ProjectById["ci-tokens"]["get"]>;
export type CiTokenDto = CiTokenListResponseDto["items"][number];

export type CiTokenCreatedDto = Data<ProjectById["ci-tokens"]["post"]>;
export type CreateCiTokenBody = Body<ProjectById["ci-tokens"]["post"]>;
