"use client";

import { useState, type ReactElement } from "react";
import {
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  SwapHoriz as SwapHorizIcon,
} from "@mui/icons-material";
import { Avatar, Box, Button, Chip, Skeleton, Stack, Typography } from "@mui/material";
import { ActionMenu } from "@/components/ui/action-menu";
import { GlassCard } from "@/components/ui/glass-card";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { useConfirm } from "@/hooks/use-confirm";
import { client } from "@/lib/api";
import type { Member, MemberListResponse } from "@/types/api/project";
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

  const handleRemove = async (member: Member) => {
    const ok = await confirm({
      title: "Remove Member",
      description: `Are you sure you want to remove ${member.user.email} from this project?`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (ok) removeMutation.mutate({ memberId: member.id });
  };

  if (isLoading) {
    return (
      <Stack spacing={2}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 3 }} />
        ))}
      </Stack>
    );
  }

  const members = data?.items ?? [];
  const nonOwnerMembers = members.filter((m) => m.role !== "OWNER");

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

      <Stack spacing={1.5}>
        {members.map((member) => {
          const name = [member.user.firstName, member.user.lastName].filter(Boolean).join(" ");
          return (
            <GlassCard key={member.id} hoverGlow={false}>
              <Stack direction="row" alignItems="center" sx={{ px: 3, py: 2 }} spacing={2}>
                <Avatar src={member.user.avatarUrl ?? undefined} sx={{ width: 40, height: 40 }}>
                  {(name || member.user.email).charAt(0).toUpperCase()}
                </Avatar>
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
