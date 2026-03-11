"use client";

import { useRef, useState, type ReactElement } from "react";
import {
  SECRET_FILE_ENV_TYPES,
  type SecretFileEnvironmentTypeValue,
} from "@depvault/shared/constants";
import { UploadFile as UploadFileIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormTextField } from "@/components/ui/form-text-field";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useToast } from "@/hooks/use-toast";
import { client } from "@/lib/api";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const mutation = useApiMutation(
    (values: {
      file: File;
      vaultGroupId: string;
      environmentType: SecretFileEnvironmentTypeValue;
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
      environmentType: "GLOBAL" as SecretFileEnvironmentTypeValue,
      description: "",
    },
    validators: { onSubmit: uploadSecretFileSchema },
    onSubmit: async ({ value }) => {
      if (!file) {
        toast.error("Please select a file");
        return;
      }
      await mutation.mutateAsync({
        file,
        vaultGroupId: value.vaultGroupId,
        environmentType: value.environmentType,
        description: value.description.trim() || undefined,
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
            <Box
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: 2,
                borderColor: file ? "primary.main" : "divider",
                borderStyle: "dashed",
                borderRadius: 2,
                p: 3,
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color 0.2s",
                "&:hover": { borderColor: "primary.main" },
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <UploadFileIcon
                sx={{ fontSize: 40, color: file ? "primary.main" : "text.secondary", mb: 1 }}
              />
              {file ? (
                <>
                  <Typography variant="body2" fontWeight={600}>
                    {file.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(file.size / 1024).toFixed(1)} KB — click to change
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Click to select a file
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Max 25 MB. Executable files (.exe, .sh, .bat, .cmd, .ps1) are not allowed.
                  </Typography>
                </>
              )}
            </Box>

            <FormSelectField
              form={form}
              name="vaultGroupId"
              label="Vault Group"
              items={groupItems}
              emptyMessage="No vault groups found. Create a group in the Variables tab first."
            />

            <FormSelectField
              form={form}
              name="environmentType"
              label="Environment"
              items={SECRET_FILE_ENV_TYPES}
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
