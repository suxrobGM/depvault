"use client";

import type { ReactElement } from "react";
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
import { useNotification } from "@/hooks/use-notification";
import { client } from "@/lib/api";
import type { EnvironmentType } from "@/types/api/environment";

const cloneSchema = z.object({
  sourceEnvironment: z.string().min(1, "Source is required"),
  targetName: z.string().min(1, "Name is required").max(100),
  targetType: z.enum(["DEVELOPMENT", "STAGING", "PRODUCTION", "CUSTOM"]),
});

const ENV_TYPES = [
  { value: "DEVELOPMENT", label: "Development" },
  { value: "STAGING", label: "Staging" },
  { value: "PRODUCTION", label: "Production" },
  { value: "CUSTOM", label: "Custom" },
] as const;

interface CloneEnvironmentDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  sourceEnvironment: string;
  onSuccess: (envName: string) => void;
}

export function CloneEnvironmentDialog(props: CloneEnvironmentDialogProps): ReactElement {
  const { open, onClose, projectId, sourceEnvironment, onSuccess } = props;
  const notification = useNotification();

  const mutation = useApiMutation(
    (values: { sourceEnvironment: string; targetName: string; targetType: string }) =>
      client.api
        .projects({ id: projectId })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .environments.clone.post(values as any) as Promise<{
        data: { id: string; name: string; variableCount: number };
        error: unknown;
      }>,
    {
      invalidateKeys: [["environments", projectId]],
      onSuccess: (data: { name: string; variableCount: number }) => {
        notification.success(`Cloned ${data.variableCount} variables to "${data.name}"`);
        onSuccess(data.name);
        handleClose();
      },
      onError: (error) => notification.error(error.message || "Failed to clone environment"),
    },
  );

  const form = useForm({
    defaultValues: {
      sourceEnvironment,
      targetName: "",
      targetType: "DEVELOPMENT" as EnvironmentType,
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
            <FormTextField
              form={form}
              name="sourceEnvironment"
              label="Source Environment"
              disabled
            />
            <FormTextField
              form={form}
              name="targetName"
              label="New Environment Name"
              autoFocus
              placeholder="e.g. production"
            />
            <FormTextField form={form} name="targetType" label="Environment Type" select>
              {ENV_TYPES.map((t) => (
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
