"use client";

import { useState, type ReactElement } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { FormTextField } from "@/components/ui/form";
import { useVault } from "@/hooks/use-vault";
import { vaultRecoverySchema } from "./schema";

interface VaultRecoveryDialogProps {
  open: boolean;
  onClose: () => void;
}

export function VaultRecoveryDialog(props: VaultRecoveryDialogProps): ReactElement {
  const { open, onClose } = props;
  const { recoverVault } = useVault();

  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      recoveryKey: "",
      newPassword: "",
      confirmPassword: "",
    },
    validators: { onSubmit: vaultRecoverySchema },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        await recoverVault(value.recoveryKey, value.newPassword);
        form.reset();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Recovery failed");
      }
    },
  });

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <DialogTitle>Recover Vault</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Enter the recovery key you saved when setting up your vault, then choose a new vault
              password.
            </Typography>

            <FormTextField
              form={form}
              name="recoveryKey"
              label="Recovery Key"
              autoFocus
              placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
              slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
            />

            <FormTextField
              form={form}
              name="newPassword"
              label="New Vault Password"
              type="password"
            />

            <FormTextField
              form={form}
              name="confirmPassword"
              label="Confirm New Password"
              type="password"
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={form.state.isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting ? "Recovering..." : "Recover Vault"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
