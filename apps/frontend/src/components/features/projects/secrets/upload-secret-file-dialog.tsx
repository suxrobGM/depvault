"use client";

import { useState, type ReactElement } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { FormSelectField, FormTextField } from "@/components/ui/form";
import { FileDropZone } from "@/components/ui/inputs";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useToast } from "@/hooks/use-toast";
import { useVault } from "@/hooks/use-vault";
import { client } from "@/lib/api";
import { encryptBinary } from "@/lib/crypto";
import type { VaultGroup } from "@/types/api/vault-group";
import { uploadSecretFileSchema } from "./secret-file-schemas";

interface UploadSecretFileDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  vaultGroups: VaultGroup[];
}

export function UploadSecretFileDialog(props: UploadSecretFileDialogProps): ReactElement {
  const { open, onClose, projectId, vaultGroups } = props;

  const [file, setFile] = useState<File | null>(null);
  const toast = useToast();
  const { getProjectDEK } = useVault();

  const mutation = useApiMutation(
    (values: {
      name: string;
      encryptedContent: string;
      iv: string;
      authTag: string;
      mimeType: string;
      fileSize: number;
      vaultGroupId: string;
      description?: string;
    }) => client.api.projects({ id: projectId }).secrets.post(values),
    {
      invalidateKeys: [["secret-files", projectId]],
      successMessage: "File uploaded successfully",
      onSuccess: () => handleClose(),
    },
  );

  const groupItems = vaultGroups.map((g) => ({ value: g.id, label: g.name }));

  const form = useForm({
    defaultValues: {
      vaultGroupId: "",
      description: "",
    },
    validators: { onSubmit: uploadSecretFileSchema },
    onSubmit: async ({ value }) => {
      if (!file) {
        toast.error("Please select a file");
        return;
      }
      const dek = await getProjectDEK(projectId);
      const fileBuffer = await file.arrayBuffer();
      const encrypted = await encryptBinary(fileBuffer, dek);
      await mutation.mutateAsync({
        name: file.name,
        encryptedContent: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        vaultGroupId: value.vaultGroupId,
        description: value.description?.trim() ?? "",
      });
    },
  });

  const handleClose = () => {
    form.reset();
    setFile(null);
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
        <DialogTitle>Upload Secret File</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FileDropZone
              file={file}
              onChange={setFile}
              hint="Max 25 MB. Executable files (.exe, .sh, .bat, .cmd, .ps1) are not allowed."
            />

            <FormSelectField
              form={form}
              name="vaultGroupId"
              label="Vault Group"
              items={groupItems}
              emptyLabel="Select a vault group"
              emptyMessage="No vault groups found. Create a group in the Variables tab first."
            />

            <FormTextField
              form={form}
              name="description"
              label="Description"
              placeholder="Optional description"
              multiline
              rows={2}
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={!file || mutation.isPending}>
            {mutation.isPending ? "Uploading..." : "Upload"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
