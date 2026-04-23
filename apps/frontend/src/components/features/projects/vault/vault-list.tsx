"use client";

import { useState, type ReactElement } from "react";
import {
  ContentCopy as CloneIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
} from "@mui/icons-material";
import {
  Box,
  Chip,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { GlassCard } from "@/components/ui/cards";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useConfirm } from "@/hooks/use-confirm";
import { client } from "@/lib/api";
import type { Vault } from "@/types/api/vault";
import { CloneVaultDialog } from "./clone-vault-dialog";

const BLESSED_TAGS: Record<string, string> = {
  prod: "#ef4444",
  staging: "#eab308",
  dev: "#10b981",
  preview: "#6366f1",
};

interface VaultListProps {
  projectId: string;
  vaults: Vault[];
  canEdit: boolean;
  selectedVaultId: string | null;
  onSelectVault: (vaultId: string) => void;
}

export function VaultList(props: VaultListProps): ReactElement {
  const { projectId, vaults, canEdit, selectedVaultId, onSelectVault } = props;
  const confirm = useConfirm();

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuVault, setMenuVault] = useState<Vault | null>(null);
  const [cloneOpen, setCloneOpen] = useState(false);

  const deleteMutation = useApiMutation(
    (vaultId: string) => client.api.projects({ id: projectId }).vaults({ vaultId }).delete(),
    {
      invalidateKeys: [["vaults", projectId]],
      successMessage: "Vault deleted",
    },
  );

  const handleDelete = async (vault: Vault) => {
    const ok = await confirm({
      title: "Delete vault",
      description: `Delete "${vault.name}" and all its variables and secret files? This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (ok) deleteMutation.mutate(vault.id);
  };

  return (
    <GlassCard>
      <List dense disablePadding>
        {vaults.map((vault) => {
          const requiredTotal = Number(vault.requiredTotal ?? 0);
          const requiredFilled = Number(vault.requiredFilled ?? 0);
          const progress = requiredTotal > 0 ? (requiredFilled / requiredTotal) * 100 : 0;

          return (
            <ListItem
              key={vault.id}
              disablePadding
              secondaryAction={
                canEdit ? (
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => {
                      setMenuAnchor(e.currentTarget);
                      setMenuVault(vault);
                    }}
                  >
                    <MoreIcon fontSize="small" />
                  </IconButton>
                ) : null
              }
            >
              <ListItemButton
                selected={selectedVaultId === vault.id}
                onClick={() => onSelectVault(vault.id)}
              >
                <ListItemText
                  disableTypography
                  primary={
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {vault.name}
                      </Typography>
                      {vault.tags?.map((tag) => {
                        const color = BLESSED_TAGS[tag.toLowerCase()];
                        return (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            sx={color ? { bgcolor: color, color: "#fff" } : undefined}
                          />
                        );
                      })}
                    </Stack>
                  }
                  secondary={
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      {vault.directoryPath ? (
                        <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                          {vault.directoryPath}
                        </Typography>
                      ) : null}
                      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {Number(vault.variableCount ?? 0)} variables ·{" "}
                          {Number(vault.secretFileCount ?? 0)} files
                        </Typography>
                        {requiredTotal > 0 ? (
                          <Box sx={{ flex: 1, minWidth: 80 }}>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              {requiredFilled} of {requiredTotal} required filled
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={progress}
                              color={progress === 100 ? "success" : "warning"}
                              sx={{ mt: 0.25, height: 4, borderRadius: 2 }}
                            />
                          </Box>
                        ) : null}
                      </Stack>
                    </Stack>
                  }
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setCloneOpen(true);
          }}
        >
          <CloneIcon fontSize="small" sx={{ mr: 1 }} />
          Clone (keys only)
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            if (menuVault) handleDelete(menuVault);
          }}
          sx={{ color: "error.main" }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      <CloneVaultDialog
        open={cloneOpen}
        onClose={() => setCloneOpen(false)}
        projectId={projectId}
        sourceVault={menuVault}
      />
    </GlassCard>
  );
}
