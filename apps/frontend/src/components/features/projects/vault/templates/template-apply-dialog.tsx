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

const applyTemplateSchema = z.object({
  environmentName: z.string().min(1, "Name is required").max(100),
  environmentType: z.enum(["DEVELOPMENT", "STAGING", "PRODUCTION", "CUSTOM"]),
});

const ENV_TYPES = [
  { value: "DEVELOPMENT", label: "Development" },
  { value: "STAGING", label: "Staging" },
  { value: "PRODUCTION", label: "Production" },
  { value: "CUSTOM", label: "Custom" },
] as const;

interface TemplateApplyDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  templateId: string | null;
  onSuccess: (envName: string) => void;
}

export function TemplateApplyDialog(props: TemplateApplyDialogProps): ReactElement {
  const { open, onClose, projectId, templateId, onSuccess } = props;
  const notification = useNotification();

  const mutation = useApiMutation(
    (values: { environmentName: string; environmentType: string }) =>
      client.api
        .projects({ id: projectId })
        ["env-templates"]({ templateId: templateId ?? "" })
        .apply.post(values),
    {
      invalidateKeys: [
        ["environments", projectId],
        ["env-templates", projectId],
      ],
      onSuccess: (data: { environmentName: string; variablesCreated: number }) => {
        notification.success(
          `Created "${data.environmentName}" with ${data.variablesCreated} variables`,
        );
        onSuccess(data.environmentName);
        handleClose();
      },
      onError: (error) => notification.error(error.message || "Failed to apply template"),
    },
  );

  const form = useForm({
    defaultValues: {
      environmentName: "",
      environmentType: "DEVELOPMENT" as "DEVELOPMENT" | "STAGING" | "PRODUCTION" | "CUSTOM",
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
              name="environmentName"
              label="New Environment Name"
              autoFocus
              placeholder="e.g. qa"
            />
            <FormTextField form={form} name="environmentType" label="Environment Type" select>
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
            {mutation.isPending ? "Applying..." : "Apply"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
