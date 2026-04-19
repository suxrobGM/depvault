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
import { FormTextField } from "@/components/ui/form";
import { useVault } from "@/hooks/use-vault";
import { vaultUnlockSchema } from "./schema";

interface VaultUnlockDialogProps {
  open: boolean;
  onClose?: () => void;
  onForgotPassword?: () => void;
}

export function VaultUnlockDialog(props: VaultUnlockDialogProps): ReactElement {
  const { open, onClose, onForgotPassword } = props;
  const { unlockVault } = useVault();

  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { password: "" },
    validators: { onSubmit: vaultUnlockSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        await unlockVault(value.password);
        form.reset();
        onClose?.();
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
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
              }}
            >
              Enter your vault password to access encrypted secrets.
            </Typography>

            <FormTextField
              form={form}
              name="password"
              label="Vault Password"
              type="password"
              autoFocus
            />

            {error && <Alert severity="error">{error}</Alert>}

            {onForgotPassword && (
              <Link
                component="button"
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
