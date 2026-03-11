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
import { createVariableSchema } from "./vault-schemas";

interface CreateVariableDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  environment: string;
}

export function CreateVariableDialog(props: CreateVariableDialogProps): ReactElement {
  const { open, onClose, projectId, environment } = props;
  const notification = useNotification();

  const mutation = useApiMutation(
    (values: {
      environment: string;
      key: string;
      value: string;
      description?: string;
      isRequired?: boolean;
      validationRule?: string;
    }) => client.api.projects({ id: projectId }).environments.variables.post(values),
    {
      invalidateKeys: [
        ["env-variables", projectId, environment],
        ["environments", projectId],
      ],
      onSuccess: () => {
        notification.success("Variable created");
        handleClose();
      },
      onError: (error) => notification.error(error.message || "Failed to create variable"),
    },
  );

  const form = useForm({
    defaultValues: {
      environment,
      key: "",
      value: "",
      description: "",
      isRequired: false,
      validationRule: "",
    },
    validators: { onSubmit: createVariableSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        environment: value.environment,
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
        <DialogTitle>New Variable</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormTextField
              form={form}
              name="key"
              label="Key"
              autoFocus
              placeholder="DATABASE_URL"
            />
            <FormTextField form={form} name="value" label="Value" placeholder="postgres://..." />
            <FormTextField
              form={form}
              name="description"
              label="Description"
              placeholder="Optional description"
            />
            <FormTextField
              form={form}
              name="validationRule"
              label="Validation Rule"
              placeholder="Optional regex or format hint"
            />
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
            {mutation.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
