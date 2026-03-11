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
import { useToast } from "@/hooks/use-toast";
import { client } from "@/lib/api";

const cloneSchema = z.object({
  sourceType: z.enum(ENVIRONMENT_TYPE_VALUES),
  targetType: z.enum(ENVIRONMENT_TYPE_VALUES),
});

interface CloneEnvironmentDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  vaultGroupId: string;
  sourceType: string;
  onSuccess: (envType: string) => void;
}

export function CloneEnvironmentDialog(props: CloneEnvironmentDialogProps): ReactElement {
  const { open, onClose, projectId, vaultGroupId, sourceType, onSuccess } = props;
  const notification = useToast();

  const mutation = useApiMutation(
    (values: { sourceType: EnvironmentTypeValue; targetType: EnvironmentTypeValue }) =>
      client.api.projects({ id: projectId }).environments.clone.post({ ...values, vaultGroupId }),
    {
      invalidateKeys: [["environments", projectId]],
      onSuccess: (data: { type: string; variableCount: number }) => {
        notification.success(`Cloned ${data.variableCount} variables to "${data.type}"`);
        onSuccess(data.type);
        handleClose();
      },
      onError: (error) => notification.error(error.message || "Failed to clone environment"),
    },
  );

  const form = useForm({
    defaultValues: {
      sourceType: sourceType as EnvironmentTypeValue,
      targetType: "DEVELOPMENT" as EnvironmentTypeValue,
    },
    validators: { onSubmit: cloneSchema },
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
        <DialogTitle>Clone Environment</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormTextField form={form} name="sourceType" label="Source Environment" disabled select>
              {ENVIRONMENT_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </FormTextField>
            <FormTextField
              form={form}
              name="targetType"
              label="Target Environment"
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
            {mutation.isPending ? "Cloning..." : "Clone"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
