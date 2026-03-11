"use client";

import type { ReactElement } from "react";
import {
  SECRET_FILE_ENV_TYPES,
  type SecretFileEnvironmentTypeValue,
} from "@depvault/shared/constants";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormTextField } from "@/components/ui/form-text-field";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { client } from "@/lib/api";
import type { SecretFile } from "@/types/api/secret-file";
import type { VaultGroup } from "@/types/api/vault-group";
import { editSecretFileSchema } from "./secret-file-schemas";

interface EditSecretFileDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  file: SecretFile;
  vaultGroups: VaultGroup[];
}

export function EditSecretFileDialog(props: EditSecretFileDialogProps): ReactElement {
  const { open, onClose, projectId, file, vaultGroups } = props;

  const groupItems = vaultGroups.map((g) => ({ value: g.id, label: g.name }));

  const mutation = useApiMutation(
    (values: {
      name?: string;
      description?: string;
      vaultGroupId?: string;
      environmentType?: SecretFileEnvironmentTypeValue;
    }) => client.api.projects({ id: projectId }).secrets({ fileId: file.id }).put(values),
    {
      invalidateKeys: [["secret-files", projectId]],
      successMessage: "File updated",
      onSuccess: () => handleClose(),
    },
  );

  const form = useForm({
    defaultValues: {
      name: file.name,
      description: file.description ?? "",
      vaultGroupId: "",
      environmentType: "GLOBAL" as SecretFileEnvironmentTypeValue,
    },
    validators: { onSubmit: editSecretFileSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        name: value.name,
        description: value.description,
        vaultGroupId: value.vaultGroupId,
        environmentType: value.environmentType,
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
        <DialogTitle>Edit File</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormTextField form={form} name="name" label="Name" autoFocus />
            <FormTextField
              form={form}
              name="description"
              label="Description"
              placeholder="Optional description"
            />
            <FormSelectField
              form={form}
              name="vaultGroupId"
              label="Move to Vault Group"
              items={groupItems}
              optional
              emptyLabel="Keep current"
            />
            <FormSelectField
              form={form}
              name="environmentType"
              label="Change Environment"
              items={SECRET_FILE_ENV_TYPES}
              optional
              emptyLabel="Keep current"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
