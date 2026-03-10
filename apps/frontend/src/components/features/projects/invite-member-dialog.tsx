"use client";

import type { ReactElement } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { FormTextField } from "@/components/ui/form-text-field";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useNotification } from "@/hooks/use-notification";
import { client } from "@/lib/api";
import { inviteMemberSchema } from "./schemas";

interface InviteMemberDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export function InviteMemberDialog(props: InviteMemberDialogProps): ReactElement {
  const { open, onClose, projectId } = props;
  const notification = useNotification();

  const mutation = useApiMutation(
    (values: { email: string; role: "EDITOR" | "VIEWER" }) =>
      client.api.projects({ id: projectId }).members.post(values),
    {
      invalidateKeys: [["projects", projectId, "members"]],
      onSuccess: () => {
        notification.success("Member invited");
        handleClose();
      },
      onError: (error) => {
        notification.error(error.message || "Failed to invite member");
      },
    },
  );

  const form = useForm({
    defaultValues: {
      email: "",
      role: "VIEWER" as "EDITOR" | "VIEWER",
    },
    validators: { onSubmit: inviteMemberSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <DialogTitle>Invite Member</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormTextField form={form} name="email" label="Email Address" type="email" autoFocus />
            <FormTextField form={form} name="role" label="Role" select>
              <MenuItem value="VIEWER">Viewer</MenuItem>
              <MenuItem value="EDITOR">Editor</MenuItem>
            </FormTextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? "Inviting..." : "Invite"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
