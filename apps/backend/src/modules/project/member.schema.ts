import { t, type Static } from "elysia";
import { ProjectRole } from "@/generated/prisma";

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
    username: t.Nullable(t.String()),
    avatarUrl: t.Nullable(t.String()),
  }),
});

export const MemberListQuerySchema = t.Object({
  page: t.Integer({ minimum: 1, default: 1 }),
  limit: t.Integer({ minimum: 1, maximum: 100, default: 20 }),
});

export const MemberListResponseSchema = t.Object({
  items: t.Array(MemberResponseSchema),
  pagination: t.Object({
    page: t.Number(),
    limit: t.Number(),
    total: t.Number(),
    totalPages: t.Number(),
  }),
});

export type InviteMemberBody = Static<typeof InviteMemberBodySchema>;
export type UpdateMemberRoleBody = Static<typeof UpdateMemberRoleBodySchema>;
export type MemberParams = Static<typeof MemberParamsSchema>;
export type TransferOwnershipBody = Static<typeof TransferOwnershipBodySchema>;
export type MemberResponse = Static<typeof MemberResponseSchema>;
export type MemberListQuery = Static<typeof MemberListQuerySchema>;
