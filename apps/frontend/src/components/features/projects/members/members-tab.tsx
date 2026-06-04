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
import { client } from "@/api/client";
import { useApiMutation, useApiQuery } from "@/api/hooks";
import { queryKeys } from "@/api/query-keys";
import type {
  InvitationDto,
  InvitationListResponseDto,
  MemberDto,
  MemberListResponseDto,
} from "@/api/types/project";
import { useAuth } from "@/auth/use-auth";
import { Surface } from "@/components/ui/cards";
import { SkeletonList, UserAvatar } from "@/components/ui/data-display";
import { ActionMenu } from "@/components/ui/inputs";
import { useConfirm } from "@/hooks/use-confirm";
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

  const { data, isLoading } = useApiQuery<MemberListResponseDto>(
    queryKeys.projects.members(projectId),
    () => client.api.projects({ id: projectId }).members.get({ query: { page: 1, limit: 50 } }),
  );

  const { data: invitationsData } = useApiQuery<InvitationListResponseDto>(
    queryKeys.projects.invitations(projectId),
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
      invalidateKeys: [queryKeys.projects.members(projectId)],
      successMessage: "Role updated",
    },
  );

  const removeMutation = useApiMutation(
    (vars: { memberId: string }) =>
      client.api.projects({ id: projectId }).members({ memberId: vars.memberId }).delete(),
    {
      invalidateKeys: [queryKeys.projects.members(projectId)],
      successMessage: "MemberDto removed",
    },
  );

  const resendMutation = useApiMutation(
    (vars: { invitationId: string }) =>
      client.api
        .projects({ id: projectId })
        .invitations({ invitationId: vars.invitationId })
        .resend.post(),
    {
      invalidateKeys: [queryKeys.projects.invitations(projectId)],
      successMessage: "InvitationDto resent",
    },
  );

  const cancelMutation = useApiMutation(
    (vars: { invitationId: string }) =>
      client.api
        .projects({ id: projectId })
        .invitations({ invitationId: vars.invitationId })
        .delete(),
    {
      invalidateKeys: [queryKeys.projects.invitations(projectId)],
      successMessage: "InvitationDto cancelled",
    },
  );

  const handleRemove = async (member: MemberDto) => {
    const ok = await confirm({
      title: "Remove MemberDto",
      description: `Are you sure you want to remove ${member.user.email} from this project?`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (ok) {
      removeMutation.mutate({ memberId: member.id });
    }
  };

  const handleCancelInvitation = async (invitation: InvitationDto) => {
    const ok = await confirm({
      title: "Cancel InvitationDto",
      description: `Are you sure you want to cancel the invitation to ${invitation.email}?`,
      confirmLabel: "Cancel InvitationDto",
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
            Invite MemberDto
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
          <Typography variant="subtitle2" sx={{ color: "text.secondary", mb: 1.5 }}>
            Pending Invitations
          </Typography>
          <Stack spacing={1.5}>
            {pendingInvitations.map((invitation) => (
              <Surface key={invitation.id}>
                <Stack direction="row" spacing={2} sx={{ alignItems: "center", px: 3, py: 2 }}>
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
                    <Typography variant="body1" noWrap sx={{ fontWeight: 500 }}>
                      {invitation.email}
                    </Typography>
                    <Typography variant="captionMuted" noWrap>
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
              </Surface>
            ))}
          </Stack>
        </Box>
      )}
      <Stack spacing={1.5}>
        {members.map((member) => {
          const name = [member.user.firstName, member.user.lastName].filter(Boolean).join(" ");
          return (
            <Surface key={member.id}>
              <Stack direction="row" spacing={2} sx={{ alignItems: "center", px: 3, py: 2 }}>
                <UserAvatar
                  firstName={member.user.firstName}
                  lastName={member.user.lastName}
                  email={member.user.email}
                  avatarUrl={member.user.avatarUrl}
                  size={40}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body1" noWrap sx={{ fontWeight: 500 }}>
                    {name || member.user.email}
                  </Typography>
                  {name && (
                    <Typography variant="captionMuted" noWrap>
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
            </Surface>
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
