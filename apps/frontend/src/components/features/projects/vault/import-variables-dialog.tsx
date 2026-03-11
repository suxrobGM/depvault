"use client";

import type { ReactElement } from "react";
import { CONFIG_FORMATS, type ConfigFormat } from "@depvault/shared/constants";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { FormTextField } from "@/components/ui/form-text-field";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useNotification } from "@/hooks/use-notification";
import { client } from "@/lib/api";
import type { EnvironmentType } from "@/types/api/environment";
import { importVariablesSchema } from "./vault-schemas";

interface ImportVariablesDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  environment: EnvironmentType;
}

export function ImportVariablesDialog(props: ImportVariablesDialogProps): ReactElement {
  const { open, onClose, projectId, environment } = props;
  const notification = useNotification();

  const mutation = useApiMutation(
    (values: { environment: EnvironmentType; format: ConfigFormat; content: string }) =>
      client.api.projects({ id: projectId }).environments.import.post(values),
    {
      invalidateKeys: [
        ["env-variables", projectId, environment],
        ["environments", projectId],
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
      environment,
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
            <FormTextField form={form} name="format" label="Format" select>
              {CONFIG_FORMATS.map((f) => (
                <MenuItem key={f.value} value={f.value}>
                  {f.label}
                </MenuItem>
              ))}
            </FormTextField>
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
