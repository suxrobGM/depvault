"use client";

import type { ReactElement } from "react";
import {
  ENVIRONMENT_TYPE_VALUES,
  ENVIRONMENT_TYPES,
  type EnvironmentTypeValue,
} from "@depvault/shared/constants";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/v4";
import { FormSelectField } from "@/components/ui/form";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { EnvVariableListResponse } from "@/types/api/env-variable";

const syncSchema = z.object({
  sourceType: z.enum(ENVIRONMENT_TYPE_VALUES),
  targetType: z.enum(ENVIRONMENT_TYPE_VALUES),
});

interface SyncEnvironmentDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  vaultGroupId: string;
  sourceType: string;
  onSuccess: (envType: string) => void;
}

export function SyncEnvironmentDialog(props: SyncEnvironmentDialogProps): ReactElement {
  const { open, onClose, projectId, vaultGroupId, sourceType, onSuccess } = props;

  const { data: sourceVarsData } = useApiQuery<EnvVariableListResponse>(
    ["env-variables", projectId, sourceType, vaultGroupId, "sync-source"],
    () =>
      client.api.projects({ id: projectId }).environments.variables.get({
        query: {
          environmentType: sourceType as EnvironmentTypeValue,
          vaultGroupId,
          page: 1,
          limit: 500,
        },
      }),
    { enabled: open },
  );

  const mutation = useApiMutation(
    (values: {
      entries: Array<{
        key: string;
        encryptedValue: string;
        iv: string;
        authTag: string;
        description?: string | null;
        isRequired?: boolean;
      }>;
      vaultGroupId: string;
      sourceEnvironmentType: EnvironmentTypeValue;
      targetEnvironmentType: EnvironmentTypeValue;
    }) => client.api.projects({ id: projectId }).environments.sync.post(values),
    {
      invalidateKeys: [["environments", projectId]],
      successMessage: (data: { type: string; variableCount: number }) =>
        `Synced ${data.variableCount} variables to "${data.type}"`,
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
    validators: { onSubmit: syncSchema },
    onSubmit: async ({ value }) => {
      const sourceVars = sourceVarsData?.items ?? [];
      const entries = sourceVars.map((v) => ({
        key: v.key,
        encryptedValue: v.encryptedValue,
        iv: v.iv,
        authTag: v.authTag,
        description: v.description,
        isRequired: v.isRequired,
      }));
      await mutation.mutateAsync({
        entries,
        vaultGroupId,
        sourceEnvironmentType: value.sourceType,
        targetEnvironmentType: value.targetType,
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
        <DialogTitle>Sync Environment</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Alert severity="info" variant="outlined">
              Variables from the source will be copied to the target. Existing keys in the target
              will be overwritten. Keys only in the target are left untouched.
            </Alert>
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
            {mutation.isPending ? "Syncing..." : "Sync"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
