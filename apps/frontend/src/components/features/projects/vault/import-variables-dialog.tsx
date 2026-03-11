"use client";

import type { ReactElement } from "react";
import {
  CONFIG_FORMATS,
  ENVIRONMENT_TYPES,
  type ConfigFormat,
  type EnvironmentTypeValue,
} from "@depvault/shared/constants";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { FileUploadButton, type FileUploadResult } from "@/components/ui/file-upload-button";
import { FormTextField } from "@/components/ui/form-text-field";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useNotification } from "@/hooks/use-notification";
import { client } from "@/lib/api";
import { importVariablesSchema } from "./vault-schemas";

interface ImportVariablesDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  vaultGroupId: string;
  /** Pass the environment name when importing into an existing environment, or null for first-time import. */
  environment: string | null;
}

export function ImportVariablesDialog(props: ImportVariablesDialogProps): ReactElement {
  const { open, onClose, projectId, vaultGroupId, environment } = props;
  const notification = useNotification();
  const isNewEnvironment = !environment;

  const mutation = useApiMutation(
    (values: {
      environment: string;
      environmentType: EnvironmentTypeValue;
      format: ConfigFormat;
      content: string;
    }) =>
      client.api
        .projects({ id: projectId })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .environments.import.post({ ...values, vaultGroupId } as any),
    {
      invalidateKeys: [
        ["env-variables", projectId, environment],
        ["environments", projectId],
        ["vault-groups", projectId],
      ],
      onSuccess: (data) => {
        notification.success(`Imported ${data?.imported} variables (${data?.skipped} skipped)`);
        handleClose();
      },
      onError: (error) => notification.error(error.message || "Failed to import variables"),
    },
  );

  const form = useForm({
    defaultValues: {
      environment: environment ?? "",
      environmentType: "DEVELOPMENT" as EnvironmentTypeValue,
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
              <>
                <FormTextField
                  form={form}
                  name="environment"
                  label="Environment Name"
                  autoFocus
                  placeholder="e.g. development, staging, production"
                />
                <FormTextField form={form} name="environmentType" label="Environment Type" select>
                  {ENVIRONMENT_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </FormTextField>
              </>
            )}
            <FormTextField form={form} name="format" label="Format" select>
              {CONFIG_FORMATS.map((f) => (
                <MenuItem key={f.value} value={f.value}>
                  {f.label}
                </MenuItem>
              ))}
            </FormTextField>
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
