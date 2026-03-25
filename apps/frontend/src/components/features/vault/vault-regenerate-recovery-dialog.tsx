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
import { useVault } from "@/hooks/use-vault";

interface DialogProps {
  open: boolean;
  onClose: () => void;
}

export function VaultRegenerateRecoveryDialog(props: DialogProps): ReactElement {
  const { open, onClose } = props;
  const { regenerateRecoveryKey } = useVault();

  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleCopy = () => {
    if (recoveryKey) {
      navigator.clipboard.writeText(recoveryKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFinish = () => {
    setRecoveryKey(null);
    setSavedConfirmed(false);
    setError(null);
    onClose();
  };

  if (recoveryKey) {
    return (
      <Dialog open={open} maxWidth="sm" fullWidth>
        <DialogTitle>New Recovery Key</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5}>
            <Alert severity="warning">
              Your previous recovery key has been invalidated. This is the only time your new
              recovery key will be shown. Save it in a secure location.
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
              label="I have saved my new recovery key in a secure location"
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Regenerate Recovery Key</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
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
