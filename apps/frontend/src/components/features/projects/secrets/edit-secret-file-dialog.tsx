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
import { useVault } from "@/hooks/use-vault";
import { client } from "@/lib/api";
import { encryptBinary } from "@/lib/crypto";
import type { SecretFile } from "@/types/api/secret-file";
import type { Vault } from "@/types/api/vault";
import { editSecretFileSchema } from "./secret-file-schemas";

interface EditSecretFileDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  file: SecretFile;
  vaults: Vault[];
}

export function EditSecretFileDialog(props: EditSecretFileDialogProps): ReactElement {
  const { open, onClose, projectId, file, vaults } = props;
  const { getProjectDEK } = useVault();

  const [newFile, setNewFile] = useState<File | null>(null);

  const vaultItems = vaults.map((v) => ({ value: v.id, label: v.name }));

  const metadataMutation = useApiMutation(
    (values: { name?: string; description?: string; vaultId?: string }) =>
      client.api.projects({ id: projectId }).secrets({ fileId: file.id }).put(values),
    { invalidateKeys: [["secret-files", projectId]], successMessage: "File updated" },
  );

  const contentMutation = useApiMutation(
    (values: {
      name: string;
      encryptedContent: string;
      iv: string;
      authTag: string;
      mimeType: string;
      fileSize: number;
    }) => client.api.projects({ id: projectId }).secrets({ fileId: file.id }).content.post(values),
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
      vaultId: "",
    },
    validators: { onSubmit: editSecretFileSchema },
    onSubmit: async ({ value }) => {
      await metadataMutation.mutateAsync({
        name: value.name,
        description: value.description,
        vaultId: value.vaultId || undefined,
      });
      if (newFile) {
        const dek = await getProjectDEK(projectId);
        const fileBuffer = await newFile.arrayBuffer();
        const encrypted = await encryptBinary(fileBuffer, dek);
        await contentMutation.mutateAsync({
          name: newFile.name,
          encryptedContent: encrypted.ciphertext,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          mimeType: newFile.type || "application/octet-stream",
          fileSize: newFile.size,
        });
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
              name="vaultId"
              label="Move to Vault"
              items={vaultItems}
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
