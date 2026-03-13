"use client";

import type { ReactElement } from "react";
import {
  ENVIRONMENT_TYPE_VALUES,
  ENVIRONMENT_TYPES,
  type EnvironmentTypeValue,
} from "@depvault/shared/constants";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/v4";
import { FormSelectField } from "@/components/ui/form";
import { useApiMutation } from "@/hooks/use-api-mutation";
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

  const mutation = useApiMutation(
    (values: { sourceType: EnvironmentTypeValue; targetType: EnvironmentTypeValue }) =>
      client.api.projects({ id: projectId }).environments.clone.post({ ...values, vaultGroupId }),
    {
      invalidateKeys: [["environments", projectId]],
      successMessage: (data: { type: string; variableCount: number }) =>
        `Cloned ${data.variableCount} variables to "${data.type}"`,
      onSuccess: (data: { type: string; variableCount: number }) => {
        onSuccess(data.type);
        handleClose();
      },
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
            <FormSelectField
              form={form}
              name="sourceType"
              label="Source Environment"
              items={ENVIRONMENT_TYPES}
              disabled
            />
            <FormSelectField
              form={form}
              name="targetType"
              label="Target Environment"
              items={ENVIRONMENT_TYPES}
              autoFocus
            />
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
