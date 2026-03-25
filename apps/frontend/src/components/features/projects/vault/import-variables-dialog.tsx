"use client";

import type { ReactElement } from "react";
import {
  CONFIG_FORMATS,
  ENVIRONMENT_TYPES,
  type ConfigFormat,
  type EnvironmentTypeValue,
} from "@depvault/shared/constants";
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
import { importVariablesSchema } from "./vault-schemas";

interface ImportVariablesDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  vaultGroupId: string;
  /** Pass the environment type when importing into an existing environment, or omit for first-time import. */
  environmentType?: string;
}

export function ImportVariablesDialog(props: ImportVariablesDialogProps): ReactElement {
  const { open, onClose, projectId, vaultGroupId, environmentType } = props;
  const isNewEnvironment = !environmentType;
  const { getProjectDEK } = useVault();

  const mutation = useApiMutation(
    async (values: {
      environmentType: EnvironmentTypeValue;
      format: ConfigFormat;
      content: string;
    }) => {
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

      return client.api.projects({ id: projectId }).environments.import.post({
        vaultGroupId,
        environmentType: values.environmentType,
        entries,
      });
    },
    {
      invalidateKeys: [
        ["env-variables", projectId],
        ["environments", projectId],
        ["vault-groups", projectId],
      ],
      successMessage: (data) => `Imported ${data?.imported} variables (${data?.updated} updated)`,
      onSuccess: () => handleClose(),
    },
  );

  const form = useForm({
    defaultValues: {
      environmentType: (environmentType ?? "DEVELOPMENT") as EnvironmentTypeValue,
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
            {isNewEnvironment && (
              <FormSelectField
                form={form}
                name="environmentType"
                label="Environment Type"
                items={ENVIRONMENT_TYPES}
                autoFocus
              />
            )}
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
            <Typography variant="caption" color="text.secondary">
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
