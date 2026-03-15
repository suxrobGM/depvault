import type { InvitationResponse } from "./invitation.schema";

export const INVITATION_INCLUDE = {
  invitedBy: { select: { firstName: true, lastName: true } },
  project: { select: { id: true, name: true } },
} as const;

type InvitationRow = {
  id: string;
  projectId: string;
  email: string;
  role: string;
  status: string;
  token: string;
  invitedById: string;
  userId: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  invitedBy: { firstName: string; lastName: string };
  project: { id: string; name: string };
};

export function toInvitationResponse(row: InvitationRow): InvitationResponse {
  return {
    id: row.id,
    projectId: row.projectId,
    email: row.email,
    role: row.role,
    status: row.status as InvitationResponse["status"],
    token: row.token,
    invitedById: row.invitedById,
    userId: row.userId,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    invitedBy: row.invitedBy,
    project: row.project,
  };
}
