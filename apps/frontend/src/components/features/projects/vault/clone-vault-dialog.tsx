"use client";

import type { ReactElement } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { FormTextField } from "@/components/ui/form";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { client } from "@/lib/api";
import type { Vault } from "@/types/api/vault";
import { cloneVaultSchema } from "./vault-schemas";

interface CloneVaultDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  sourceVault: Vault | null;
}

export function CloneVaultDialog(props: CloneVaultDialogProps): ReactElement {
  const { open, onClose, projectId, sourceVault } = props;

  const mutation = useApiMutation(
    (values: { targetName: string }) =>
      client.api
        .projects({ id: projectId })
        .vaults({ vaultId: sourceVault?.id ?? "" })
        .clone.post(values),
    {
      invalidateKeys: [["vaults", projectId]],
      successMessage: "Vault duplicated",
      onSuccess: () => handleClose(),
    },
  );

  const form = useForm({
    defaultValues: {
      targetName: sourceVault ? `${sourceVault.name}-copy` : "",
    },
    validators: { onSubmit: cloneVaultSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({ targetName: value.targetName });
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
        <DialogTitle>Duplicate Vault</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <DialogContentText>
              Creates a full copy of <b>{sourceVault?.name}</b> — same keys, values, descriptions,
              required flags, directory path, and tags. Secret files are not copied. Edit the new
              vault to change whatever needs to differ.
            </DialogContentText>
            <FormTextField form={form} name="targetName" label="Target vault name" autoFocus />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? "Duplicating..." : "Duplicate"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
