import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import { PaginationQueryBaseSchema } from "@/types/pagination";
import { MessageResponseSchema } from "@/types/response";
import { InvitationListResponseSchema, InvitationTokenParamsSchema } from "./invitation.schema";
import { InvitationService } from "./invitation.service";

const invitationService = container.resolve(InvitationService);

export const invitationController = new Elysia({
  prefix: "/invitations",
  detail: { tags: ["Invitations"] },
})
  .use(authGuard)
  .get(
    "/pending",
    ({ query, user }) => invitationService.listForUser(user.id, query.page, query.limit),
    {
      query: PaginationQueryBaseSchema,
      response: InvitationListResponseSchema,
      detail: {
        operationId: "listPendingInvitations",
        summary: "List pending invitations for current user",
        description:
          "Return a paginated list of pending project invitations for the authenticated user.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post("/:token/accept", ({ params, user }) => invitationService.accept(params.token, user.id), {
    params: InvitationTokenParamsSchema,
    response: MessageResponseSchema,
    detail: {
      operationId: "acceptInvitation",
      summary: "Accept a project invitation",
      description:
        "Accept a pending project invitation using its token. The authenticated user must match the invitation's email.",
      security: [{ bearerAuth: [] }],
    },
  })
  .post("/:token/decline", ({ params, user }) => invitationService.decline(params.token, user.id), {
    params: InvitationTokenParamsSchema,
    response: MessageResponseSchema,
    detail: {
      operationId: "declineInvitation",
      summary: "Decline a project invitation",
      description:
        "Decline a pending project invitation using its token. The authenticated user must match the invitation's email.",
      security: [{ bearerAuth: [] }],
    },
  });
