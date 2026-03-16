"use client";

import { useState, type ReactElement } from "react";
import { Alert } from "@mui/material";

interface BillingAlertsProps {
  success: boolean;
  canceled: boolean;
}

export function BillingAlerts(props: BillingAlertsProps): ReactElement {
  const { success, canceled } = props;
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || (!success && !canceled)) {
    return <></>;
  }

  const handleClose = () => {
    setDismissed(true);
    window.history.replaceState(null, "", window.location.pathname);
  };

  if (success) {
    return (
      <Alert severity="success" onClose={handleClose} sx={{ mb: 3 }}>
        Your subscription has been updated successfully. Changes may take a moment to reflect.
      </Alert>
    );
  }

  return (
    <Alert severity="info" onClose={handleClose} sx={{ mb: 3 }}>
      Checkout was canceled. No changes were made to your subscription.
    </Alert>
  );
}
