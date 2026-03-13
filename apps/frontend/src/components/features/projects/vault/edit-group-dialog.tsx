"use client";

import type { ReactElement } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/v4";
import { FormTextField } from "@/components/ui/form";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { client } from "@/lib/api";
import type { VaultGroup } from "@/types/api/vault-group";

const updateGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500),
});

interface EditGroupDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  group: VaultGroup;
}

export function EditGroupDialog(props: EditGroupDialogProps): ReactElement {
  const { open, onClose, projectId, group } = props;

  const mutation = useApiMutation(
    (values: { name?: string; description?: string | null }) =>
      client.api.projects({ id: projectId })["vault-groups"]({ groupId: group.id }).put(values),
    {
      invalidateKeys: [["vault-groups", projectId]],
      successMessage: "Vault group updated",
      onSuccess: () => onClose(),
    },
  );

  const form = useForm({
    defaultValues: {
      name: group.name,
      description: group.description ?? "",
    },
    validators: { onSubmit: updateGroupSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        name: value.name,
        description: value.description || null,
      });
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <DialogTitle>Edit Vault Group</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormTextField form={form} name="name" label="Name" autoFocus />
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
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
