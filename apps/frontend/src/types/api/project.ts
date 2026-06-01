import type { client } from "@/lib/api";
import type { Data } from "./utils";

type Projects = typeof client.api.projects;
type ProjectById = ReturnType<Projects>;
type Invitations = typeof client.api.invitations;
type InvitationById = ReturnType<Invitations>;

export type ProjectListResponseDto = Data<Projects["get"]>;
export type ProjectDto = ProjectListResponseDto["items"][number];

export type ProjectDetailDto = Data<ProjectById["get"]>;

export type MemberListResponseDto = Data<ProjectById["members"]["get"]>;
export type MemberDto = MemberListResponseDto["items"][number];

export type ProjectStatsDto = Data<Projects["stats"]["get"]>;

export type InvitationListResponseDto = Data<ProjectById["invitations"]["get"]>;
export type InvitationDto = InvitationListResponseDto["items"][number];

export type InvitationInfoDto = Data<InvitationById["info"]["get"]>;

export type PendingInvitationListResponseDto = Data<Invitations["pending"]["get"]>;
