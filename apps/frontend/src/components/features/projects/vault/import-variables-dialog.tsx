"use client";

import type { ReactElement } from "react";
import { CONFIG_FORMATS, type ConfigFormat } from "@depvault/shared/constants";
import { parseConfig } from "@depvault/shared/parsers";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { FormSelectField, FormTextField } from "@/components/ui/form";
import { FileUploadButton, type FileUploadResult } from "@/components/ui/inputs";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useVault } from "@/hooks/use-vault";
import { client } from "@/lib/api";
import { encrypt } from "@/lib/crypto";
import type { ImportResult } from "@/types/api/env-variable";
import { importVariablesSchema } from "./vault-schemas";

interface ImportVariablesDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  vaultId: string;
}

export function ImportVariablesDialog(props: ImportVariablesDialogProps): ReactElement {
  const { open, onClose, projectId, vaultId } = props;
  const { getProjectDEK } = useVault();

  const mutation = useApiMutation(
    async (values: { format: ConfigFormat; content: string }) => {
      const dek = await getProjectDEK(projectId);
      const parsed = parseConfig(values.format, values.content);

      const entries = await Promise.all(
        parsed.map(async (entry, index) => {
          const encrypted = await encrypt(entry.value, dek);
          let commentFields = {};

          if (entry.comment) {
            const encComment = await encrypt(entry.comment, dek);
            commentFields = {
              encryptedComment: encComment.ciphertext,
              commentIv: encComment.iv,
              commentAuthTag: encComment.authTag,
            };
          }

          return {
            key: entry.key,
            encryptedValue: encrypted.ciphertext,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            sortOrder: index,
            ...commentFields,
          };
        }),
      );

      return client.api.projects({ id: projectId }).vaults({ vaultId }).import.post({ entries });
    },
    {
      invalidateKeys: [
        ["vault-variables", projectId, vaultId],
        ["vaults", projectId],
      ],
      successMessage: (data: ImportResult | undefined) =>
        `Imported ${data?.imported ?? 0} variables (${data?.updated ?? 0} updated)`,
      onSuccess: () => handleClose(),
    },
  );

  const form = useForm({
    defaultValues: {
      format: "env" as ConfigFormat,
      content: "",
    },
    validators: { onSubmit: importVariablesSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const handleFileRead = (result: FileUploadResult) => {
    if (result.detectedFormat) {
      form.setFieldValue("format", result.detectedFormat);
    }
    form.setFieldValue("content", result.content);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <DialogTitle>Import Variables</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormSelectField form={form} name="format" label="Format" items={CONFIG_FORMATS} />
            <FileUploadButton onFileRead={handleFileRead} />
            <FormTextField
              form={form}
              name="content"
              label="Content"
              multiline
              minRows={6}
              maxRows={16}
              placeholder="Paste your config file content here..."
              slotProps={{ input: { sx: { fontFamily: "monospace", fontSize: 13 } } }}
            />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Upload a file or paste content directly. Format is auto-detected from file extension.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? "Importing..." : "Import"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
