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
import { FormTextField } from "@/components/ui/form";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useVault } from "@/hooks/use-vault";
import { client } from "@/lib/api";
import { encrypt } from "@/lib/crypto";
import { createVariableSchema } from "./vault-schemas";

interface CreateVariableDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  vaultId: string;
}

export function CreateVariableDialog(props: CreateVariableDialogProps): ReactElement {
  const { open, onClose, projectId, vaultId } = props;
  const { getProjectDEK } = useVault();

  const mutation = useApiMutation(
    (values: {
      key: string;
      encryptedValue: string;
      iv: string;
      authTag: string;
      description?: string;
      isRequired?: boolean;
    }) => client.api.projects({ id: projectId }).vaults({ vaultId }).variables.post(values),
    {
      invalidateKeys: [
        ["vault-variables", projectId, vaultId],
        ["vaults", projectId],
      ],
      successMessage: "Variable created",
      onSuccess: () => handleClose(),
    },
  );

  const form = useForm({
    defaultValues: {
      key: "",
      value: "",
      description: "",
      isRequired: false,
    },
    validators: { onSubmit: createVariableSchema },
    onSubmit: async ({ value }) => {
      const dek = await getProjectDEK(projectId);
      const encrypted = await encrypt(value.value, dek);
      await mutation.mutateAsync({
        key: value.key,
        encryptedValue: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        description: value.description,
        isRequired: value.isRequired,
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
