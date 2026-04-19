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
import { useVault } from "@/hooks/use-vault";
import { RecoveryKeyDisplay } from "./recovery-key-display";

interface DialogProps {
  open: boolean;
  onClose: () => void;
}

export function VaultRegenerateRecoveryDialog(props: DialogProps): ReactElement {
  const { open, onClose } = props;
  const { regenerateRecoveryKey } = useVault();

  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setError(null);
    setIsRegenerating(true);
    try {
      const result = await regenerateRecoveryKey();
      setRecoveryKey(result.recoveryKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate recovery key");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleFinish = () => {
    setRecoveryKey(null);
    setError(null);
    onClose();
  };

  if (recoveryKey) {
    return (
      <RecoveryKeyDisplay
        open={open}
        title="New Recovery Key"
        warning="Your previous recovery key has been invalidated. This is the only time your new recovery key will be shown. Save it in a secure location."
        confirmLabel="I have saved my new recovery key in a secure location"
        recoveryKey={recoveryKey}
        onDone={handleFinish}
      />
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Regenerate Recovery Key</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
            This will generate a new recovery key and invalidate the old one. You will need to save
            the new key in a secure location.
          </Typography>

          <Alert severity="warning">
            If you lose both your vault password and the new recovery key, your encrypted data will
            be permanently unrecoverable.
          </Alert>

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isRegenerating}>
          Cancel
        </Button>
        <Button
          onClick={handleRegenerate}
          variant="contained"
          color="warning"
          disabled={isRegenerating}
        >
          {isRegenerating ? "Regenerating..." : "Regenerate"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
