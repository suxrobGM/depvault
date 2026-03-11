"use client";

import type { ReactElement } from "react";
import {
  ENVIRONMENT_TYPE_VALUES,
  ENVIRONMENT_TYPES,
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
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/v4";
import { FormTextField } from "@/components/ui/form-text-field";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { client } from "@/lib/api";

const applyTemplateSchema = z.object({
  environmentType: z.enum(ENVIRONMENT_TYPE_VALUES),
});

interface TemplateApplyDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  vaultGroupId: string;
  templateId: string | null;
  onSuccess: (envType: string) => void;
}

export function TemplateApplyDialog(props: TemplateApplyDialogProps): ReactElement {
  const { open, onClose, projectId, vaultGroupId, templateId, onSuccess } = props;

  const mutation = useApiMutation(
    (values: { environmentType: EnvironmentTypeValue }) =>
      client.api
        .projects({ id: projectId })
        ["env-templates"]({ templateId: templateId ?? "" })
        .apply.post({ ...values, vaultGroupId }),
    {
      invalidateKeys: [
        ["environments", projectId],
        ["env-templates", projectId],
      ],
      successMessage: (data: { environmentType: string; variablesCreated: number }) =>
        `Created "${data.environmentType}" environment with ${data.variablesCreated} variables`,
      errorMessage: "Failed to apply template",
      onSuccess: (data: { environmentType: string; variablesCreated: number }) => {
        onSuccess(data.environmentType);
        handleClose();
      },
    },
  );

  const form = useForm({
    defaultValues: {
      environmentType: "DEVELOPMENT" as EnvironmentTypeValue,
    },
    validators: { onSubmit: applyTemplateSchema },
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
        <DialogTitle>Apply Template</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormTextField
              form={form}
              name="environmentType"
              label="Environment Type"
              select
              autoFocus
            >
              {ENVIRONMENT_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </FormTextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? "Applying..." : "Apply"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
