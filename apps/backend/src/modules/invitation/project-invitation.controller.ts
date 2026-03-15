import Elysia from "elysia";
import { container } from "@/common/di";
import { authGuard } from "@/common/middleware";
import { MessageResponseSchema } from "@/types/response";
import { ProjectIdParamSchema } from "../project/member.schema";
import {
  CreateInvitationBodySchema,
  InvitationListQuerySchema,
  InvitationListResponseSchema,
  InvitationParamsSchema,
  InvitationResponseSchema,
} from "./invitation.schema";
import { InvitationService } from "./invitation.service";

const invitationService = container.resolve(InvitationService);

/** Project-scoped invitation endpoints registered under /projects/:id */
export const projectInvitationController = new Elysia({
  prefix: "/projects/:id",
  detail: { tags: ["Invitations"] },
})
  .use(authGuard)
  .post(
    "/members",
    ({ params, body, user }) => invitationService.create(params.id, body, user.id),
    {
      params: ProjectIdParamSchema,
      body: CreateInvitationBodySchema,
      response: InvitationResponseSchema,
      detail: {
        operationId: "inviteMember",
        summary: "Invite member to project",
        description:
          "Create a pending invitation for a user by email to join the project with a specified role (editor or viewer). If the user is not on the platform, a registration invitation email is sent. Only the project owner can invite members.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/invitations",
    ({ params, query, user }) =>
      invitationService.listByProject(params.id, user.id, query.page, query.limit),
    {
      params: ProjectIdParamSchema,
      query: InvitationListQuerySchema,
      response: InvitationListResponseSchema,
      detail: {
        operationId: "listProjectInvitations",
        summary: "List project invitations",
        description:
          "Return a paginated list of pending invitations for the project. Any project member can view invitations.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/invitations/:invitationId/resend",
    ({ params, user }) => invitationService.resend(params.id, params.invitationId, user.id),
    {
      params: InvitationParamsSchema,
      response: MessageResponseSchema,
      detail: {
        operationId: "resendInvitation",
        summary: "Resend project invitation",
        description:
          "Resend the invitation email for a pending invitation. Only the project owner can resend invitations.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete(
    "/invitations/:invitationId",
    ({ params, user }) => invitationService.cancel(params.id, params.invitationId, user.id),
    {
      params: InvitationParamsSchema,
      response: MessageResponseSchema,
      detail: {
        operationId: "cancelInvitation",
        summary: "Cancel project invitation",
        description: "Cancel a pending invitation. Only the project owner can cancel invitations.",
        security: [{ bearerAuth: [] }],
      },
    },
  );
