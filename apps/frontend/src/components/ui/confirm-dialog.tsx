"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@mui/material";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  confirmationText?: string;
  confirmationHint?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A reusable confirmation dialog component that can be used for actions like deleting an account, removing a project, etc.
 * It supports an optional confirmation text input for extra safety on destructive actions.
 */
export function ConfirmDialog(props: ConfirmDialogProps): ReactElement {
  const {
    open,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    destructive = false,
    loading = false,
    confirmationText,
    confirmationHint,
    onConfirm,
    onCancel,
  } = props;

  const [inputValue, setInputValue] = useState("");
  const requiresInput = !!confirmationText;
  const inputMatches = !requiresInput || inputValue === confirmationText;

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      onTransitionExited={() => setInputValue("")}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{description}</DialogContentText>
        {requiresInput && (
          <>
            <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
              This action is permanent and cannot be undone.
            </Alert>
            <DialogContentText sx={{ mt: 1, mb: 1 }}>
              {confirmationHint ?? (
                <>
                  Type <strong>{confirmationText}</strong> to confirm.
                </>
              )}
            </DialogContentText>
            <TextField
              fullWidth
              size="small"
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmationText}
              onKeyDown={(e) => {
                if (e.key === "Enter" && inputMatches && !loading) {
                  onConfirm();
                }
              }}
              sx={{ mt: 1 }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          color={destructive ? "error" : "primary"}
          variant="contained"
          disabled={loading || !inputMatches}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
