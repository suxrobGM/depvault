"use client";

import type { ReactElement } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { FormTextField } from "@/components/ui/form-text-field";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useNotification } from "@/hooks/use-notification";
import { client } from "@/lib/api";
import type { EnvVariable } from "@/types/api/env-variable";
import { updateVariableSchema } from "./vault-schemas";

interface EditVariableDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  environment: string;
  variable: EnvVariable | null;
}

export function EditVariableDialog(props: EditVariableDialogProps): ReactElement {
  const { open, onClose, projectId, environment, variable } = props;
  const notification = useNotification();

  const mutation = useApiMutation(
    (values: {
      key?: string;
      value?: string;
      description?: string;
      isRequired?: boolean;
      validationRule?: string;
    }) =>
      client.api
        .projects({ id: projectId })
        .environments.variables({ varId: variable?.id ?? "" })
        .put(values),
    {
      invalidateKeys: [["env-variables", projectId, environment]],
      onSuccess: () => {
        notification.success("Variable updated");
        handleClose();
      },
      onError: (error) => notification.error(error.message || "Failed to update variable"),
    },
  );

  const form = useForm({
    defaultValues: {
      key: variable?.key ?? "",
      value: variable?.value ?? "",
      description: variable?.description ?? "",
      isRequired: variable?.isRequired ?? false,
      validationRule: variable?.validationRule ?? "",
    },
    validators: { onSubmit: updateVariableSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        key: value.key,
        value: value.value,
        description: value.description,
        isRequired: value.isRequired,
        validationRule: value.validationRule,
      });
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
        <DialogTitle>Edit Variable</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormTextField form={form} name="key" label="Key" autoFocus />
            <FormTextField form={form} name="value" label="Value" />
            <FormTextField form={form} name="description" label="Description" />
            <FormTextField form={form} name="validationRule" label="Validation Rule" />
            <form.Field name="isRequired">
              {(field) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!field.state.value}
                      onChange={(e) => field.handleChange(e.target.checked)}
                    />
                  }
                  label="Required for local setup"
                />
              )}
            </form.Field>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
