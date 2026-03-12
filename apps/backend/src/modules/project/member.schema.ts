import { t, type Static } from "elysia";
import { ProjectRole } from "@/generated/prisma";
import { PaginationQueryBaseSchema } from "@/types/pagination";
import { PaginatedResponseSchema } from "@/types/response";

export const ProjectRoleSchema = t.Enum(ProjectRole);
export const InviteRoleSchema = t.Union([
  t.Literal(ProjectRole.EDITOR),
  t.Literal(ProjectRole.VIEWER),
]);

export const InviteMemberBodySchema = t.Object({
  email: t.String({ format: "email" }),
  role: InviteRoleSchema,
});

export const UpdateMemberRoleBodySchema = t.Object({
  role: InviteRoleSchema,
});

export const MemberParamsSchema = t.Object({
  id: t.String(),
  memberId: t.String(),
});

export const ProjectIdParamSchema = t.Object({
  id: t.String(),
});

export const TransferOwnershipBodySchema = t.Object({
  newOwnerId: t.String(),
});

export const MemberResponseSchema = t.Object({
  id: t.String(),
  projectId: t.String(),
  userId: t.String(),
  role: ProjectRoleSchema,
  createdAt: t.Date(),
  updatedAt: t.Date(),
  user: t.Object({
    id: t.String(),
    email: t.String(),
    firstName: t.String(),
    lastName: t.String(),
    avatarUrl: t.Nullable(t.String()),
  }),
});

export const MemberListQuerySchema = PaginationQueryBaseSchema;

export const MemberListResponseSchema = PaginatedResponseSchema(MemberResponseSchema);

export type InviteMemberBody = Static<typeof InviteMemberBodySchema>;
export type UpdateMemberRoleBody = Static<typeof UpdateMemberRoleBodySchema>;
export type MemberParams = Static<typeof MemberParamsSchema>;
export type TransferOwnershipBody = Static<typeof TransferOwnershipBodySchema>;
export type MemberResponse = Static<typeof MemberResponseSchema>;
export type MemberListQuery = Static<typeof MemberListQuerySchema>;
