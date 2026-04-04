"use client";

import { useState, type ReactElement } from "react";
import {
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  HourglassEmpty as HourglassIcon,
  PersonAdd as PersonAddIcon,
  Replay as ReplayIcon,
  SwapHoriz as SwapHorizIcon,
} from "@mui/icons-material";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { GlassCard } from "@/components/ui/cards";
import { SkeletonList, UserAvatar } from "@/components/ui/data-display";
import { ActionMenu } from "@/components/ui/inputs";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { useConfirm } from "@/hooks/use-confirm";
import { client } from "@/lib/api";
import type {
  Invitation,
  InvitationListResponse,
  Member,
  MemberListResponse,
} from "@/types/api/project";
import { InviteMemberDialog } from "./invite-member-dialog";
import { TransferOwnershipDialog } from "./transfer-ownership-dialog";

interface MembersTabProps {
  projectId: string;
}

const ROLE_COLORS: Record<string, "primary" | "secondary" | "default"> = {
  OWNER: "primary",
  EDITOR: "secondary",
  VIEWER: "default",
};

export function MembersTab(props: MembersTabProps): ReactElement {
  const { projectId } = props;
  const { user } = useAuth();
  const confirm = useConfirm();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const { data, isLoading } = useApiQuery<MemberListResponse>(
    ["projects", projectId, "members"],
    () => client.api.projects({ id: projectId }).members.get({ query: { page: 1, limit: 50 } }),
  );

  const { data: invitationsData } = useApiQuery<InvitationListResponse>(
    ["projects", projectId, "invitations"],
    () => client.api.projects({ id: projectId }).invitations.get({ query: { page: 1, limit: 50 } }),
  );

  const isOwner = data?.items.find((m) => m.user.id === user?.id)?.role === "OWNER";

  const updateRoleMutation = useApiMutation(
    (vars: { memberId: string; role: "EDITOR" | "VIEWER" }) =>
      client.api
        .projects({ id: projectId })
        .members({ memberId: vars.memberId })
        .put({ role: vars.role }),
    {
      invalidateKeys: [["projects", projectId, "members"]],
      successMessage: "Role updated",
    },
  );

  const removeMutation = useApiMutation(
    (vars: { memberId: string }) =>
      client.api.projects({ id: projectId }).members({ memberId: vars.memberId }).delete(),
    {
      invalidateKeys: [["projects", projectId, "members"]],
      successMessage: "Member removed",
    },
  );

  const resendMutation = useApiMutation(
    (vars: { invitationId: string }) =>
      client.api
        .projects({ id: projectId })
        .invitations({ invitationId: vars.invitationId })
        .resend.post(),
    {
      invalidateKeys: [["projects", projectId, "invitations"]],
      successMessage: "Invitation resent",
    },
  );

  const cancelMutation = useApiMutation(
    (vars: { invitationId: string }) =>
      client.api
        .projects({ id: projectId })
        .invitations({ invitationId: vars.invitationId })
        .delete(),
    {
      invalidateKeys: [["projects", projectId, "invitations"]],
      successMessage: "Invitation cancelled",
    },
  );

  const handleRemove = async (member: Member) => {
    const ok = await confirm({
      title: "Remove Member",
      description: `Are you sure you want to remove ${member.user.email} from this project?`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (ok) {
      removeMutation.mutate({ memberId: member.id });
    }
  };

  const handleCancelInvitation = async (invitation: Invitation) => {
    const ok = await confirm({
      title: "Cancel Invitation",
      description: `Are you sure you want to cancel the invitation to ${invitation.email}?`,
      confirmLabel: "Cancel Invitation",
      destructive: true,
    });
    if (ok) {
      cancelMutation.mutate({ invitationId: invitation.id });
    }
  };

  if (isLoading) {
    return <SkeletonList count={3} height={72} spacing={2} />;
  }

  const members = data?.items ?? [];
  const nonOwnerMembers = members.filter((m) => m.role !== "OWNER");
  const pendingInvitations = invitationsData?.items ?? [];

  return (
    <Box className="vault-fade-up vault-delay-2">
      {isOwner && (
        <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setInviteOpen(true)}
          >
            Invite Member
          </Button>
          {nonOwnerMembers.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<SwapHorizIcon />}
              onClick={() => setTransferOpen(true)}
            >
              Transfer Ownership
            </Button>
          )}
        </Stack>
      )}

      {isOwner && pendingInvitations.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
            Pending Invitations
          </Typography>
          <Stack spacing={1.5}>
            {pendingInvitations.map((invitation) => (
              <GlassCard key={invitation.id} hoverGlow={false}>
                <Stack direction="row" alignItems="center" sx={{ px: 3, py: 2 }} spacing={2}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "action.hover",
                    }}
                  >
                    <EmailIcon fontSize="small" color="action" />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body1" fontWeight={500} noWrap>
                      {invitation.email}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      Invited by {invitation.invitedBy.firstName} {invitation.invitedBy.lastName}
                    </Typography>
                  </Box>
                  <Chip
                    label={invitation.role}
                    size="small"
                    color={ROLE_COLORS[invitation.role]}
                    variant="outlined"
                  />
                  <Chip
                    icon={<HourglassIcon />}
                    label="Pending"
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                  <ActionMenu
                    items={[
                      {
                        label: "Resend",
                        icon: <ReplayIcon fontSize="small" />,
                        onClick: () => resendMutation.mutate({ invitationId: invitation.id }),
                      },
                      {
                        label: "Cancel",
                        icon: <CancelIcon fontSize="small" />,
                        onClick: () => handleCancelInvitation(invitation),
                        destructive: true,
                      },
                    ]}
                  />
                </Stack>
              </GlassCard>
            ))}
          </Stack>
        </Box>
      )}

      <Stack spacing={1.5}>
        {members.map((member) => {
          const name = [member.user.firstName, member.user.lastName].filter(Boolean).join(" ");
          return (
            <GlassCard key={member.id} hoverGlow={false}>
              <Stack direction="row" alignItems="center" sx={{ px: 3, py: 2 }} spacing={2}>
                <UserAvatar
                  firstName={member.user.firstName}
                  lastName={member.user.lastName}
                  email={member.user.email}
                  avatarUrl={member.user.avatarUrl}
                  size={40}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body1" fontWeight={500} noWrap>
                    {name || member.user.email}
                  </Typography>
                  {name && (
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {member.user.email}
                    </Typography>
                  )}
                </Box>
                <Chip
                  label={member.role}
                  size="small"
                  color={ROLE_COLORS[member.role]}
                  variant="outlined"
                />
                {isOwner && member.role !== "OWNER" && (
                  <ActionMenu
                    items={[
                      {
                        label: "Change to Editor",
                        onClick: () =>
                          updateRoleMutation.mutate({ memberId: member.id, role: "EDITOR" }),
                        hidden: member.role === "EDITOR",
                      },
                      {
                        label: "Change to Viewer",
                        onClick: () =>
                          updateRoleMutation.mutate({ memberId: member.id, role: "VIEWER" }),
                        hidden: member.role === "VIEWER",
                      },
                      {
                        label: "Remove",
                        icon: <DeleteIcon fontSize="small" />,
                        onClick: () => handleRemove(member),
                        destructive: true,
                      },
                    ]}
                  />
                )}
              </Stack>
            </GlassCard>
          );
        })}
      </Stack>

      <InviteMemberDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        projectId={projectId}
      />
      <TransferOwnershipDialog
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        projectId={projectId}
        members={nonOwnerMembers}
      />
    </Box>
  );
}
