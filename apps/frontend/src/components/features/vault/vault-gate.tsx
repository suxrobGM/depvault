"use client";

import { useState, type PropsWithChildren, type ReactElement } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useVault } from "@/hooks/use-vault";
import { VaultRecoveryDialog } from "./vault-recovery-dialog";
import { VaultSetupDialog } from "./vault-setup-dialog";
import { VaultUnlockDialog } from "./vault-unlock-dialog";

/** Wraps vault-dependent content. Shows setup/unlock dialogs as needed before rendering children. */
export function VaultGate(props: PropsWithChildren): ReactElement {
  const { children } = props;
  const { vaultStatus } = useVault();
  const [showRecovery, setShowRecovery] = useState(false);

  if (vaultStatus === "loading") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (vaultStatus === "no-vault") {
    return <VaultSetupDialog open onClose={() => {}} />;
  }

  if (vaultStatus === "locked") {
    return (
      <>
        <VaultUnlockDialog open onForgotPassword={() => setShowRecovery(true)} />
        <VaultRecoveryDialog open={showRecovery} onClose={() => setShowRecovery(false)} />
      </>
    );
  }

  return <>{children}</>;
}
