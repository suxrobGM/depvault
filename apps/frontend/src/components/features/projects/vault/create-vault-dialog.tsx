"use client";

import { useState, type ReactElement } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { FormTextField } from "@/components/ui/form";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { client } from "@/lib/api";
import { createVaultSchema } from "./vault-schemas";
import { VaultTagInput } from "./vault-tag-input";

interface CreateVaultDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export function CreateVaultDialog(props: CreateVaultDialogProps): ReactElement {
  const { open, onClose, projectId } = props;
  const [tags, setTags] = useState<string[]>([]);

  const mutation = useApiMutation(
    (values: { name: string; directoryPath?: string; tags?: string[] }) =>
      client.api.projects({ id: projectId }).vaults.post(values),
    {
      invalidateKeys: [
        ["vaults", projectId],
        ["vault-tags", projectId],
      ],
      successMessage: "Vault created",
      onSuccess: () => handleClose(),
    },
  );

  const form = useForm({
    defaultValues: {
      name: "",
      directoryPath: "",
    },
    validators: { onSubmit: createVaultSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        name: value.name,
        directoryPath: value.directoryPath || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
    },
  });

  const handleClose = () => {
    form.reset();
    setTags([]);
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
        <DialogTitle>New Vault</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormTextField form={form} name="name" label="Name" autoFocus placeholder="api-prod" />
            <FormTextField
              form={form}
              name="directoryPath"
              label="Directory path (optional)"
              placeholder="apps/api"
            />
            <VaultTagInput projectId={projectId} value={tags} onChange={setTags} />
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
