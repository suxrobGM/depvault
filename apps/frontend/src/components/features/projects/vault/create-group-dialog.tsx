"use client";

import type { ReactElement } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/v4";
import { FormTextField } from "@/components/ui/form-text-field";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useToast } from "@/hooks/use-toast";
import { client } from "@/lib/api";

const createGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500),
});

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export function CreateGroupDialog(props: CreateGroupDialogProps): ReactElement {
  const { open, onClose, projectId } = props;
  const notification = useToast();

  const mutation = useApiMutation(
    (values: { name: string; description?: string }) =>
      client.api.projects({ id: projectId })["vault-groups"].post(values),
    {
      invalidateKeys: [["vault-groups", projectId]],
      onSuccess: () => {
        notification.success("Vault group created");
        handleClose();
      },
      onError: (error) => notification.error(error.message ?? "Failed to create group"),
    },
  );

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
    },
    validators: { onSubmit: createGroupSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        name: value.name,
        description: value.description,
      });
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
        <DialogTitle>New Vault Group</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormTextField
              form={form}
              name="name"
              label="Name"
              autoFocus
              placeholder="e.g. backend, frontend, database"
            />
            <FormTextField
              form={form}
              name="description"
              label="Description"
              placeholder="Optional description for this group"
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
