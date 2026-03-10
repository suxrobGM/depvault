"use client";

import { useState, type ReactElement } from "react";
import { Warning as WarningIcon } from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useNotification } from "@/hooks/use-notification";
import { client } from "@/lib/api";
import type { Member } from "@/types/api/project";

interface TransferOwnershipDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  members: Member[];
}

export function TransferOwnershipDialog(props: TransferOwnershipDialogProps): ReactElement {
  const { open, onClose, projectId, members } = props;
  const notification = useNotification();
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const mutation = useApiMutation(
    (vars: { newOwnerId: string }) => client.api.projects({ id: projectId }).transfer.post(vars),
    {
      invalidateKeys: [
        ["projects", projectId],
        ["projects", projectId, "members"],
      ],
      onSuccess: () => {
        notification.success("Ownership transferred");
        handleClose();
        router.refresh();
      },
      onError: () => {
        notification.error("Failed to transfer ownership");
      },
    },
  );

  const handleClose = () => {
    setSelectedUserId(null);
    onClose();
  };

  const handleConfirm = () => {
    if (selectedUserId) {
      mutation.mutate({ newOwnerId: selectedUserId });
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Transfer Ownership</DialogTitle>
      <DialogContent>
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
          <Typography variant="body2">
            This action cannot be undone. You will become an Editor after the transfer.
          </Typography>
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select the new owner:
        </Typography>
        <List>
          {members.map((member) => {
            const name = [member.user.firstName, member.user.lastName].filter(Boolean).join(" ");
            return (
              <ListItemButton
                key={member.id}
                selected={selectedUserId === member.userId}
                onClick={() => setSelectedUserId(member.userId)}
                sx={{ borderRadius: 2 }}
              >
                <ListItemAvatar>
                  <Avatar src={member.user.avatarUrl ?? undefined}>
                    {(name || member.user.email).charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={name || member.user.email}
                  secondary={name ? member.user.email : undefined}
                />
              </ListItemButton>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          color="warning"
          variant="contained"
          onClick={handleConfirm}
          disabled={!selectedUserId || mutation.isPending}
        >
          {mutation.isPending ? "Transferring..." : "Transfer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
