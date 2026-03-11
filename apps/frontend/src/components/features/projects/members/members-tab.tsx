"use client";

import { useState, type ReactElement } from "react";
import {
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  PersonAdd as PersonAddIcon,
  SwapHoriz as SwapHorizIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { GlassCard } from "@/components/ui/glass-card";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

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
      onSuccess: () => setRemoveConfirmOpen(false),
    },
  );

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, member: Member) => {
    setMenuAnchor(event.currentTarget);
    setSelectedMember(member);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedMember(null);
  };

  const handleRoleChange = (role: "EDITOR" | "VIEWER") => {
    if (selectedMember) {
      updateRoleMutation.mutate({ memberId: selectedMember.id, role });
    }
    handleMenuClose();
  };

  const handleRemoveClick = () => {
    setMenuAnchor(null);
    setRemoveConfirmOpen(true);
  };

  const handleRemoveConfirm = () => {
    if (selectedMember) {
      removeMutation.mutate({ memberId: selectedMember.id });
    }
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
                  <IconButton size="small" onClick={(e) => handleMenuOpen(e, member)}>
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            </GlassCard>
          );
        })}
      </Stack>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        {selectedMember?.role !== "EDITOR" && (
          <MenuItem onClick={() => handleRoleChange("EDITOR")}>
            <ListItemText>Change to Editor</ListItemText>
          </MenuItem>
        )}
        {selectedMember?.role !== "VIEWER" && (
          <MenuItem onClick={() => handleRoleChange("VIEWER")}>
            <ListItemText>Change to Viewer</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={handleRemoveClick} sx={{ color: "error.main" }}>
          <ListItemIcon sx={{ color: "error.main" }}>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Remove</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={removeConfirmOpen} onClose={() => setRemoveConfirmOpen(false)}>
        <DialogTitle>Remove Member</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove <strong>{selectedMember?.user.email}</strong> from this
            project?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveConfirmOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleRemoveConfirm}
            disabled={removeMutation.isPending}
          >
            {removeMutation.isPending ? "Removing..." : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>

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
