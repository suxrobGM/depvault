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

const applyTemplateSchema = z.object({
  vaultGroupId: z.string().min(1, "Select a vault group"),
  environmentType: z.enum(ENVIRONMENT_TYPE_VALUES),
});

interface TemplateApplyDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  vaultGroups: Array<{ id: string; name: string }>;
  templateId: string | null;
  onSuccess: (envType: string) => void;
}

export function TemplateApplyDialog(props: TemplateApplyDialogProps): ReactElement {
  const { open, onClose, projectId, vaultGroups, templateId, onSuccess } = props;

  const mutation = useApiMutation(
    (values: { vaultGroupId: string; environmentType: EnvironmentTypeValue }) =>
      client.api
        .projects({ id: projectId })
        ["env-templates"]({ templateId: templateId ?? "" })
        .apply.post(values),
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
      vaultGroupId: vaultGroups[0]?.id ?? "",
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
            <FormSelectField
              form={form}
              name="vaultGroupId"
              label="Target Vault Group"
              items={vaultGroups.map((g) => ({ value: g.id, label: g.name }))}
              emptyMessage="Add a vault group before applying a template."
              autoFocus
            />
            <FormSelectField
              form={form}
              name="environmentType"
              label="Environment Type"
              items={ENVIRONMENT_TYPES}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={mutation.isPending || vaultGroups.length === 0}
          >
            {mutation.isPending ? "Applying..." : "Apply"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
