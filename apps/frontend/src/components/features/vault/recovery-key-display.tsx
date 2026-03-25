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

interface RecoveryKeyDisplayProps {
  open: boolean;
  title: string;
  warning: string;
  confirmLabel: string;
  recoveryKey: string;
  onDone: () => void;
}

/** Shared dialog for displaying a recovery key with copy and confirmation. */
export function RecoveryKeyDisplay(props: RecoveryKeyDisplayProps): ReactElement {
  const { open, title, warning, confirmLabel, recoveryKey, onDone } = props;

  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(recoveryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDone = () => {
    setSavedConfirmed(false);
    onDone();
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5}>
          <Alert severity="warning">{warning}</Alert>

          <Box
            sx={{
              p: 2,
              bgcolor: "action.hover",
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
            }}
          >
            <KeyIcon sx={{ opacity: 0.6, flexShrink: 0 }} />
            <Typography
              component="span"
              sx={{
                fontFamily: "monospace",
                fontSize: "0.95rem",
                letterSpacing: "0.05em",
                wordBreak: "break-all",
              }}
            >
              {recoveryKey}
            </Typography>
            <Tooltip title={copied ? "Copied!" : "Copy"}>
              <IconButton onClick={handleCopy} size="small" sx={{ flexShrink: 0 }}>
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
            label={confirmLabel}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDone} variant="contained" disabled={!savedConfirmed}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
