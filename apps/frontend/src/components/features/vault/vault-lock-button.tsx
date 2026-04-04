"use client";

import { useState, type ReactElement } from "react";
import { Lock as LockIcon, LockOpen as LockOpenIcon } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material";
import { useVault } from "@/hooks/use-vault";
import { VaultUnlockDialog } from "./vault-unlock-dialog";

export function VaultLockButton(): ReactElement {
  const { isVaultSetup, isVaultUnlocked, lockVault } = useVault();
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);

  if (!isVaultSetup) {
    return <></>;
  }

  const handleClick = () => {
    if (isVaultUnlocked) {
      lockVault();
    } else {
      setUnlockDialogOpen(true);
    }
  };

  return (
    <>
      <Tooltip title={isVaultUnlocked ? "Lock Vault" : "Unlock Vault"} placement="top">
        <IconButton
          size="small"
          onClick={handleClick}
          sx={{ color: isVaultUnlocked ? "success.main" : "warning.main" }}
        >
          {isVaultUnlocked ? <LockOpenIcon fontSize="small" /> : <LockIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      <VaultUnlockDialog
        open={unlockDialogOpen && !isVaultUnlocked}
        onClose={() => setUnlockDialogOpen(false)}
      />
    </>
  );
}
