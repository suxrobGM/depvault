"use client";

import type { ReactElement } from "react";
import {
  ENVIRONMENT_TYPES,
  getEnvironmentLabel,
  type EnvironmentTypeValue,
} from "@depvault/shared/constants";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/v4";
import { FormSelectField, FormTextField } from "@/components/ui/form";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { client } from "@/lib/api";

const saveTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500),
  sourceVaultGroupId: z.string(),
  sourceEnvironmentType: z.string(),
});

interface TemplateSaveDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  vaultGroups: Array<{ id: string; name: string }>;
}

export function TemplateSaveDialog(props: TemplateSaveDialogProps): ReactElement {
  const { open, onClose, projectId, vaultGroups } = props;

  const mutation = useApiMutation(
    (values: {
      name: string;
      description?: string;
      sourceVaultGroupId?: string;
      sourceEnvironmentType?: EnvironmentTypeValue;
    }) => client.api.projects({ id: projectId })["env-templates"].post(values),
    {
      invalidateKeys: [["env-templates", projectId]],
      successMessage: (data: { name: string; variableCount: number }) =>
        `Template "${data.name}" saved with ${data.variableCount} variables`,
      onSuccess: () => handleClose(),
    },
  );

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      sourceVaultGroupId: "",
      sourceEnvironmentType: "",
    },
    validators: { onSubmit: saveTemplateSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        name: value.name,
        description: value.description,
        ...(value.sourceVaultGroupId && value.sourceEnvironmentType
          ? {
              sourceVaultGroupId: value.sourceVaultGroupId,
              sourceEnvironmentType: value.sourceEnvironmentType as EnvironmentTypeValue,
            }
          : {}),
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
            <Typography variant="subtitle2" color="text.secondary">
              Copy from existing environment (optional)
            </Typography>
            <FormSelectField
              form={form}
              name="sourceVaultGroupId"
              label="Vault Group"
              items={vaultGroups.map((g) => ({ value: g.id, label: g.name }))}
              optional
            />
            <form.Subscribe selector={(s) => s.values.sourceVaultGroupId}>
              {(sourceVaultGroupId) =>
                sourceVaultGroupId ? (
                  <FormSelectField
                    form={form}
                    name="sourceEnvironmentType"
                    label="Environment Type"
                    items={ENVIRONMENT_TYPES.map((t) => ({
                      value: t.value,
                      label: getEnvironmentLabel(t.value),
                    }))}
                  />
                ) : null
              }
            </form.Subscribe>
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
