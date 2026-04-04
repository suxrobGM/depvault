"use client";

import { useState, type ReactElement } from "react";
import { Lock as LockIcon, LockOpen as LockOpenIcon } from "@mui/icons-material";
import { Chip, ListItemButton, ListItemIcon, ListItemText, Stack } from "@mui/material";
import { useVault } from "@/hooks/use-vault";
import { VaultUnlockDialog } from "./vault-unlock-dialog";

interface VaultLockButtonProps {
  open: boolean;
}

export function VaultLockButton(props: VaultLockButtonProps): ReactElement {
  const { open } = props;
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
      <ListItemButton
        onClick={handleClick}
        sx={{
          mb: 0.5,
          justifyContent: open ? "initial" : "center",
          px: open ? 2 : 1.5,
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: open ? 40 : "auto",
            justifyContent: "center",
            color: "text.secondary",
          }}
        >
          {isVaultUnlocked ? <LockOpenIcon /> : <LockIcon />}
        </ListItemIcon>
        {open && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1 }}>
            <ListItemText primary="Vault" />
            <Chip
              label={isVaultUnlocked ? "Unlocked" : "Locked"}
              size="small"
              color={isVaultUnlocked ? "success" : "warning"}
              variant="outlined"
              sx={{ fontSize: "0.65rem", height: 20 }}
            />
          </Stack>
        )}
      </ListItemButton>
      <VaultUnlockDialog
        open={unlockDialogOpen && !isVaultUnlocked}
        onClose={() => setUnlockDialogOpen(false)}
      />
    </>
  );
}
