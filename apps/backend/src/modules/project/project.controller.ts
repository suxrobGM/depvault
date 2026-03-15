import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import { StringIdParamSchema } from "@/types/request";
import { MessageResponseSchema } from "@/types/response";
import {
  CreateInvitationBodySchema,
  InvitationListQuerySchema,
  InvitationListResponseSchema,
  InvitationParamsSchema,
  InvitationResponseSchema,
} from "./invitation.schema";
import { InvitationService } from "./invitation.service";
import {
  MemberListQuerySchema,
  MemberListResponseSchema,
  MemberParamsSchema,
  MemberResponseSchema,
  ProjectIdParamSchema,
  TransferOwnershipBodySchema,
  UpdateMemberRoleBodySchema,
} from "./member.schema";
import { MemberService } from "./member.service";
import {
  CreateProjectBodySchema,
  ProjectListQuerySchema,
  ProjectListResponseSchema,
  ProjectResponseSchema,
  ProjectStatsResponseSchema,
  UpdateProjectBodySchema,
} from "./project.schema";
import { ProjectService } from "./project.service";

const projectService = container.resolve(ProjectService);
const memberService = container.resolve(MemberService);
const invitationService = container.resolve(InvitationService);

export const projectController = new Elysia({
  prefix: "/projects",
  detail: { tags: ["Projects"] },
})
  .use(authGuard)
  .post("/", ({ body, user }) => projectService.create(body, user.id), {
    body: CreateProjectBodySchema,
    response: ProjectResponseSchema,
    detail: {
      operationId: "createProject",
      summary: "Create a new project",
      description:
        "Create a project and add the authenticated user as the owner. Projects serve as containers for dependency analyses and environment variables.",
      security: [{ bearerAuth: [] }],
    },
  })
  .get("/", ({ query, user }) => projectService.list(user.id, query.page, query.limit), {
    query: ProjectListQuerySchema,
    response: ProjectListResponseSchema,
    detail: {
      operationId: "listProjects",
      summary: "List projects",
      description:
        "Return a paginated list of projects where the authenticated user is a member (owner, editor, or viewer).",
      security: [{ bearerAuth: [] }],
    },
  })
  .get("/stats", ({ user }) => projectService.getStats(user.id), {
    response: ProjectStatsResponseSchema,
    detail: {
      operationId: "getDashboardStats",
      summary: "Get dashboard stats",
      description:
        "Return aggregate statistics across all projects the authenticated user is a member of.",
      security: [{ bearerAuth: [] }],
    },
  })
  .get("/:id", ({ params, user }) => projectService.getById(params.id, user.id), {
    params: StringIdParamSchema,
    response: ProjectResponseSchema,
    detail: {
      operationId: "getProject",
      summary: "Get project details",
      description:
        "Return details of a specific project. The authenticated user must be a member of the project.",
      security: [{ bearerAuth: [] }],
    },
  })
  .put("/:id", ({ params, body, user }) => projectService.update(params.id, body, user.id), {
    params: StringIdParamSchema,
    body: UpdateProjectBodySchema,
    response: ProjectResponseSchema,
    detail: {
      operationId: "updateProject",
      summary: "Update project",
      description:
        "Update project name and/or description. Only owners and editors are allowed to update.",
      security: [{ bearerAuth: [] }],
    },
  })
  .delete("/:id", ({ params, user }) => projectService.delete(params.id, user.id), {
    params: StringIdParamSchema,
    response: MessageResponseSchema,
    detail: {
      operationId: "deleteProject",
      summary: "Delete project",
      description:
        "Permanently delete a project and all associated data (analyses, environments, variables). Only the project owner can delete.",
      security: [{ bearerAuth: [] }],
    },
  })
  // Member management
  .post(
    "/:id/members",
    ({ params, body, user }) => invitationService.create(params.id, body, user.id),
    {
      params: ProjectIdParamSchema,
      body: CreateInvitationBodySchema,
      response: InvitationResponseSchema,
      detail: {
        operationId: "inviteMember",
        tags: ["Members"],
        summary: "Invite member to project",
        description:
          "Create a pending invitation for a user by email to join the project with a specified role (editor or viewer). If the user is not on the platform, a registration invitation email is sent. Only the project owner can invite members.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/:id/members",
    ({ params, query, user }) => memberService.list(params.id, user.id, query.page, query.limit),
    {
      params: ProjectIdParamSchema,
      query: MemberListQuerySchema,
      response: MemberListResponseSchema,
      detail: {
        operationId: "listMembers",
        tags: ["Members"],
        summary: "List project members",
        description:
          "Return a paginated list of all members in the project with their roles. Any project member can view the member list.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .put(
    "/:id/members/:memberId",
    ({ params, body, user }) => memberService.updateRole(params.id, params.memberId, body, user.id),
    {
      params: MemberParamsSchema,
      body: UpdateMemberRoleBodySchema,
      response: MemberResponseSchema,
      detail: {
        operationId: "updateMemberRole",
        tags: ["Members"],
        summary: "Update member role",
        description:
          "Update the role of a project member. Only the project owner can change member roles.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete(
    "/:id/members/:memberId",
    ({ params, user }) => memberService.remove(params.id, params.memberId, user.id),
    {
      params: MemberParamsSchema,
      response: MessageResponseSchema,
      detail: {
        operationId: "removeMember",
        tags: ["Members"],
        summary: "Remove member from project",
        description:
          "Remove a member from the project. Only the project owner can remove members. The owner cannot be removed.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/:id/transfer",
    ({ params, body, user }) => memberService.transferOwnership(params.id, body, user.id),
    {
      params: ProjectIdParamSchema,
      body: TransferOwnershipBodySchema,
      response: MessageResponseSchema,
      detail: {
        operationId: "transferProjectOwnership",
        tags: ["Members"],
        summary: "Transfer project ownership",
        description:
          "Transfer project ownership to another member. The current owner becomes an editor. Only the current owner can transfer ownership.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  // Invitation management
  .get(
    "/:id/invitations",
    ({ params, query, user }) =>
      invitationService.listByProject(params.id, user.id, query.page, query.limit),
    {
      params: ProjectIdParamSchema,
      query: InvitationListQuerySchema,
      response: InvitationListResponseSchema,
      detail: {
        operationId: "listProjectInvitations",
        tags: ["Invitations"],
        summary: "List project invitations",
        description:
          "Return a paginated list of pending invitations for the project. Any project member can view invitations.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/:id/invitations/:invitationId/resend",
    ({ params, user }) => invitationService.resend(params.id, params.invitationId, user.id),
    {
      params: InvitationParamsSchema,
      response: MessageResponseSchema,
      detail: {
        operationId: "resendInvitation",
        tags: ["Invitations"],
        summary: "Resend project invitation",
        description:
          "Resend the invitation email for a pending invitation. Only the project owner can resend invitations.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete(
    "/:id/invitations/:invitationId",
    ({ params, user }) => invitationService.cancel(params.id, params.invitationId, user.id),
    {
      params: InvitationParamsSchema,
      response: MessageResponseSchema,
      detail: {
        operationId: "cancelInvitation",
        tags: ["Invitations"],
        summary: "Cancel project invitation",
        description: "Cancel a pending invitation. Only the project owner can cancel invitations.",
        security: [{ bearerAuth: [] }],
      },
    },
  );
