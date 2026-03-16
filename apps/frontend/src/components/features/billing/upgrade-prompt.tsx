"use client";

import type { ReactElement } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

interface UpgradePromptProps {
  open: boolean;
  onClose: () => void;
  message: string;
}

/** A dialog shown when a user hits a plan limit, prompting them to upgrade. */
export function UpgradePrompt(props: UpgradePromptProps): ReactElement {
  const { open, onClose, message } = props;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Plan Limit Reached</DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 1 }}>
          {message}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Upgrade your plan to increase your limits and unlock additional features.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button component={Link} href={ROUTES.billing} variant="contained" onClick={onClose}>
          View Plans
        </Button>
      </DialogActions>
    </Dialog>
  );
}
