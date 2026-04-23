"use client";

import { useEffect, useState, type ReactElement } from "react";
import {
  Button,
  Checkbox,
  CircularProgress,
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
import { decrypt, encrypt } from "@/lib/crypto";
import type { EnvVariable } from "@/types/api/env-variable";
import { updateVariableSchema } from "./vault-schemas";

interface EditVariableDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  vaultId: string;
  variable: EnvVariable | null;
}

export function EditVariableDialog(props: EditVariableDialogProps): ReactElement {
  const { open, onClose, projectId, vaultId, variable } = props;
  const { getProjectDEK } = useVault();
  const [decrypting, setDecrypting] = useState(open && !!variable && !!variable?.encryptedValue);

  const mutation = useApiMutation(
    (values: {
      key?: string;
      encryptedValue?: string;
      iv?: string;
      authTag?: string;
      description?: string;
      isRequired?: boolean;
    }) =>
      client.api
        .projects({ id: projectId })
        .vaults({ vaultId })
        .variables({ varId: variable?.id ?? "" })
        .put(values),
    {
      invalidateKeys: [
        ["vault-variables", projectId, vaultId],
        ["vaults", projectId],
      ],
      successMessage: "Variable updated",
      onSuccess: () => handleClose(),
    },
  );

  const form = useForm({
    defaultValues: {
      key: variable?.key ?? "",
      value: "",
      description: variable?.description ?? "",
      isRequired: variable?.isRequired ?? false,
    },
    validators: { onSubmit: updateVariableSchema },
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

  useEffect(() => {
    if (!open || !variable || !variable.encryptedValue) {
      setDecrypting(false);
      return;
    }
    let cancelled = false;
    getProjectDEK(projectId)
      .then((dek) => decrypt(variable.encryptedValue, variable.iv, variable.authTag, dek))
      .then((plaintext) => {
        if (!cancelled) form.setFieldValue("value", plaintext);
      })
      .finally(() => {
        if (!cancelled) setDecrypting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, variable?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
            <FormTextField
              form={form}
              name="value"
              label="Value"
              disabled={decrypting}
              placeholder={decrypting ? "Decrypting..." : undefined}
              slotProps={{
                input: {
                  endAdornment: decrypting ? <CircularProgress size={16} /> : undefined,
                },
              }}
            />
            <FormTextField form={form} name="description" label="Description" />
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
