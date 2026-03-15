import { t, type Static } from "elysia";
import { InvitationStatus } from "@/generated/prisma";
import { PaginationQueryBaseSchema } from "@/types/pagination";
import { PaginatedResponseSchema } from "@/types/response";
import { InviteRoleSchema } from "./member.schema";

export const InvitationStatusSchema = t.Enum(InvitationStatus);

export const CreateInvitationBodySchema = t.Object({
  email: t.String({ format: "email" }),
  role: InviteRoleSchema,
});

export const InvitationParamsSchema = t.Object({
  id: t.String(),
  invitationId: t.String(),
});

export const InvitationTokenParamsSchema = t.Object({
  token: t.String(),
});

export const InvitationResponseSchema = t.Object({
  id: t.String(),
  projectId: t.String(),
  email: t.String(),
  role: t.String(),
  status: InvitationStatusSchema,
  token: t.String(),
  invitedById: t.String(),
  userId: t.Nullable(t.String()),
  expiresAt: t.Date(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
  invitedBy: t.Object({
    firstName: t.String(),
    lastName: t.String(),
  }),
  project: t.Object({
    id: t.String(),
    name: t.String(),
  }),
});

export const InvitationListQuerySchema = PaginationQueryBaseSchema;

export const InvitationListResponseSchema = PaginatedResponseSchema(InvitationResponseSchema);

export type CreateInvitationBody = Static<typeof CreateInvitationBodySchema>;
export type InvitationParams = Static<typeof InvitationParamsSchema>;
export type InvitationTokenParams = Static<typeof InvitationTokenParamsSchema>;
export type InvitationResponse = Static<typeof InvitationResponseSchema>;
export type InvitationListQuery = Static<typeof InvitationListQuerySchema>;
