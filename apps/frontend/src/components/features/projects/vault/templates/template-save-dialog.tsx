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
import type { EnvironmentItem } from "@/types/api/environment";

const saveTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500),
  sourceEnvironment: z.string().min(1, "Select a source environment"),
});

interface TemplateSaveDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  environments: EnvironmentItem[];
  currentEnvironment: string | null;
}

export function TemplateSaveDialog(props: TemplateSaveDialogProps): ReactElement {
  const { open, onClose, projectId, environments, currentEnvironment } = props;
  const notification = useNotification();

  const mutation = useApiMutation(
    (values: { name: string; description?: string; sourceEnvironment: string }) =>
      client.api.projects({ id: projectId })["env-templates"].post(values),
    {
      invalidateKeys: [["env-templates", projectId]],
      onSuccess: (data: { name: string; variableCount: number }) => {
        notification.success(`Template "${data.name}" saved with ${data.variableCount} variables`);
        handleClose();
      },
      onError: (error) => notification.error(error.message || "Failed to save template"),
    },
  );

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      sourceEnvironment: currentEnvironment ?? "",
    },
    validators: { onSubmit: saveTemplateSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        name: value.name,
        description: value.description || undefined,
        sourceEnvironment: value.sourceEnvironment,
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
        <DialogTitle>Save as Template</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormTextField
              form={form}
              name="name"
              label="Template Name"
              autoFocus
              placeholder="e.g. Standard Backend"
            />
            <FormTextField
              form={form}
              name="description"
              label="Description"
              placeholder="Optional description"
            />
            <FormTextField form={form} name="sourceEnvironment" label="Source Environment" select>
              {environments.map((env) => (
                <MenuItem key={env.id} value={env.name}>
                  {env.name} ({env.variableCount} variables)
                </MenuItem>
              ))}
            </FormTextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save Template"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
