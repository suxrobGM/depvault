"use client";

import { useState, type ReactElement } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { FormSelectField, FormTextField } from "@/components/ui/form";
import { FileDropZone } from "@/components/ui/inputs";
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

  const [newFile, setNewFile] = useState<File | null>(null);

  const groupItems = vaultGroups.map((g) => ({ value: g.id, label: g.name }));

  const metadataMutation = useApiMutation(
    (values: { name?: string; description?: string; vaultGroupId?: string }) =>
      client.api.projects({ id: projectId }).secrets({ fileId: file.id }).put(values),
    { invalidateKeys: [["secret-files", projectId]], successMessage: "File updated" },
  );

  const contentMutation = useApiMutation(
    (values: { file: File }) =>
      client.api.projects({ id: projectId }).secrets({ fileId: file.id }).content.post(values),
    {
      invalidateKeys: [
        ["secret-files", projectId],
        ["secret-file-versions", projectId, file.id],
      ],
      successMessage: "New version uploaded",
    },
  );

  const form = useForm({
    defaultValues: {
      name: file.name,
      description: file.description ?? "",
      vaultGroupId: "",
    },
    validators: { onSubmit: editSecretFileSchema },
    onSubmit: async ({ value }) => {
      await metadataMutation.mutateAsync({
        name: value.name,
        description: value.description,
        vaultGroupId: value.vaultGroupId || undefined,
      });
      if (newFile) {
        await contentMutation.mutateAsync({ file: newFile });
      }
      handleClose();
    },
  });

  const handleClose = () => {
    form.reset();
    setNewFile(null);
    onClose();
  };

  const isPending = metadataMutation.isPending || contentMutation.isPending;

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

            <Divider />

            <Typography variant="subtitle2">Replace File Content</Typography>
            <FileDropZone
              file={newFile}
              onChange={setNewFile}
              hint="Current content will be saved to version history"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
