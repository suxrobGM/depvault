"use client";

import { useState, type ReactElement } from "react";
import { ContentCopy as CopyIcon, Key as KeyIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { FormTextField } from "@/components/ui/form";
import { useVault } from "@/hooks/use-vault";
import { vaultSetupSchema } from "./schema";

interface VaultSetupDialogProps {
  open: boolean;
  onClose: () => void;
}

export function VaultSetupDialog(props: VaultSetupDialogProps): ReactElement {
  const { open, onClose } = props;
  const { setupVault } = useVault();

  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    validators: { onSubmit: vaultSetupSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const result = await setupVault(value.password);
        setRecoveryKey(result.recoveryKey);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to set up vault");
      }
    },
  });

  const handleCopy = () => {
    if (recoveryKey) {
      navigator.clipboard.writeText(recoveryKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFinish = () => {
    form.reset();
    setRecoveryKey(null);
    setSavedConfirmed(false);
    onClose();
  };

  if (recoveryKey) {
    return (
      <Dialog open={open} maxWidth="sm" fullWidth>
        <DialogTitle>Save Your Recovery Key</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5}>
            <Alert severity="warning">
              This is the only time your recovery key will be shown. If you lose your vault password
              and this key, your encrypted data will be permanently unrecoverable.
            </Alert>

            <Box
              sx={{
                p: 2,
                bgcolor: "action.hover",
                borderRadius: 1,
                fontFamily: "monospace",
                fontSize: "0.95rem",
                letterSpacing: "0.05em",
                textAlign: "center",
                wordBreak: "break-all",
                position: "relative",
              }}
            >
              <KeyIcon sx={{ mr: 1, verticalAlign: "middle", opacity: 0.6 }} />
              {recoveryKey}
              <Tooltip title={copied ? "Copied!" : "Copy"}>
                <IconButton onClick={handleCopy} size="small" sx={{ ml: 1 }}>
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={savedConfirmed}
                  onChange={(_, checked) => setSavedConfirmed(checked)}
                />
              }
              label="I have saved my recovery key in a secure location"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFinish} variant="contained" disabled={!savedConfirmed}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <DialogTitle>Set Up Your Vault</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Your vault password encrypts your secrets end-to-end. It is separate from your login
              password and never sent to the server.
            </Typography>

            <FormTextField
              form={form}
              name="password"
              label="Vault Password"
              type="password"
              autoFocus
            />

            <FormTextField
              form={form}
              name="confirmPassword"
              label="Confirm Vault Password"
              type="password"
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={form.state.isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting ? "Setting up..." : "Set Up Vault"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
