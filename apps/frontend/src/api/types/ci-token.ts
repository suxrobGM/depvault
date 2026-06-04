import type { Body, Data } from "@depvault/shared/api";
import type { client } from "@/api/client";

type ProjectById = ReturnType<typeof client.api.projects>;

export type CiTokenListResponseDto = Data<ProjectById["ci-tokens"]["get"]>;
export type CiTokenDto = CiTokenListResponseDto["items"][number];

export type CiTokenCreatedDto = Data<ProjectById["ci-tokens"]["post"]>;
export type CreateCiTokenBody = Body<ProjectById["ci-tokens"]["post"]>;
