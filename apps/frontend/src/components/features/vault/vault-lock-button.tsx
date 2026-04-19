"use client";

import { useState, type ReactElement } from "react";
import { Lock as LockIcon, LockOpen as LockOpenIcon } from "@mui/icons-material";
import {
  Chip,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
} from "@mui/material";
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

  const iconColor = isVaultUnlocked ? "success.main" : "warning.main";
  const icon = isVaultUnlocked ? <LockOpenIcon /> : <LockIcon />;
  const label = isVaultUnlocked ? "Unlocked" : "Locked";
  const chipColor = isVaultUnlocked ? "success" : "warning";

  return (
    <>
      {open ? (
        <ListItemButton onClick={handleClick} sx={{ mb: 0.5, px: 2 }}>
          <ListItemIcon sx={{ minWidth: 40, color: iconColor }}>{icon}</ListItemIcon>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              flex: 1,
            }}
          >
            <ListItemText primary="Vault" />
            <Chip
              label={label}
              size="small"
              color={chipColor}
              sx={{
                height: 20,
                fontSize: "0.65rem",
                fontWeight: 600,
                bgcolor: (theme) =>
                  isVaultUnlocked
                    ? `${theme.palette.success.main}1F`
                    : `${theme.palette.warning.main}1F`,
                color: iconColor,
              }}
            />
          </Stack>
        </ListItemButton>
      ) : (
        <Tooltip title={`Vault · ${label}`} placement="right">
          <IconButton size="small" onClick={handleClick} sx={{ color: iconColor }}>
            {icon}
          </IconButton>
        </Tooltip>
      )}
      <VaultUnlockDialog
        open={unlockDialogOpen && !isVaultUnlocked}
        onClose={() => setUnlockDialogOpen(false)}
      />
    </>
  );
}
