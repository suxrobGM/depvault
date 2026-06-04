"use client";

import { useState, type ReactElement } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { FormCheckboxField, FormTextField } from "@/components/ui/form";
import { useVault } from "@/hooks/use-vault";
import { REMEMBER_DEVICE_DAYS } from "@/lib/constants";
import { vaultUnlockSchema } from "./schemas";

interface VaultUnlockDialogProps {
  open: boolean;
  onClose?: () => void;
  onForgotPassword?: () => void;
  /**
   * Fired on a successful unlock. When provided, it replaces onClose on the success path (onClose
   * still fires when the dialog is dismissed without unlocking) — used to re-auth and retry an
   * action that needs the recovery key.
   */
  onUnlocked?: () => void;
}

export function VaultUnlockDialog(props: VaultUnlockDialogProps): ReactElement {
  const { open, onClose, onForgotPassword, onUnlocked } = props;
  const { unlockVault } = useVault();

  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { password: "", keepUnlocked: false },
    validators: { onSubmit: vaultUnlockSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        await unlockVault(value.password, value.keepUnlocked);
        form.reset();
        if (onUnlocked) {
          onUnlocked();
        } else {
          onClose?.();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to unlock vault");
      }
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <DialogTitle>Unlock Vault</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2Muted">
              Enter your vault password to access encrypted secrets.
            </Typography>

            <FormTextField
              form={form}
              name="password"
              label="Vault Password"
              type="password"
              autoFocus
            />

            <FormCheckboxField
              form={form}
              name="keepUnlocked"
              label={`Keep this vault unlocked on this device for ${REMEMBER_DEVICE_DAYS} days`}
            />

            {error && <Alert severity="error">{error}</Alert>}

            {onForgotPassword && (
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={onForgotPassword}
                sx={{ alignSelf: "flex-start" }}
              >
                Forgot vault password?
              </Link>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          {onClose && <Button onClick={onClose}>Cancel</Button>}
          <Button type="submit" variant="contained" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting ? "Unlocking..." : "Unlock"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
