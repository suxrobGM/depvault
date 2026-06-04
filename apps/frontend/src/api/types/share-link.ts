import type { Body, Data } from "@depvault/shared/api";
import type { client } from "@/api/client";

type ProjectById = ReturnType<typeof client.api.projects>;
type ShareByToken = ReturnType<typeof client.api.shares>;

export type ShareLinkListResponseDto = Data<ProjectById["shares"]["get"]>;
export type ShareLinkItemDto = ShareLinkListResponseDto["items"][number];

export type CreateShareBody = Body<ProjectById["shares"]["post"]>;
export type CreateShareDto = Data<ProjectById["shares"]["post"]>;

export type ShareLinkInfoDto = Data<ShareByToken["info"]["get"]>;

export type AccessShareBody = Body<ShareByToken["post"]>;
export type AccessShareDto = Data<ShareByToken["post"]>;
