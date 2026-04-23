"use client";

import { useState, type ReactElement } from "react";
import { ContentCopy as CloneIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { Box, List, Menu, MenuItem, Typography } from "@mui/material";
import { GlassCard } from "@/components/ui/cards";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useConfirm } from "@/hooks/use-confirm";
import { client } from "@/lib/api";
import type { Vault } from "@/types/api/vault";
import { CloneVaultDialog } from "./clone-vault-dialog";
import { VaultListItem } from "./vault-list-item";
import { ALL_TAGS, VaultListToolbar } from "./vault-list-toolbar";

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

  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(ALL_TAGS);
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

  const availableTags = collectTags(vaults);
  const filteredVaults = filterVaults(vaults, search, activeTag);

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
    <GlassCard hoverGlow={false} sx={{ overflow: "hidden" }}>
      <VaultListToolbar
        search={search}
        onSearchChange={setSearch}
        tags={availableTags}
        activeTag={activeTag}
        onTagChange={setActiveTag}
      />

      <List dense disablePadding sx={{ borderTop: "1px solid", borderColor: "divider" }}>
        {filteredVaults.length === 0 ? (
          <Box sx={{ py: 3, textAlign: "center" }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              No vaults match.
            </Typography>
          </Box>
        ) : (
          filteredVaults.map((vault) => (
            <VaultListItem
              key={vault.id}
              vault={vault}
              canEdit={canEdit}
              selected={selectedVaultId === vault.id}
              onSelect={() => onSelectVault(vault.id)}
              onOpenMenu={(target) => {
                setMenuAnchor(target);
                setMenuVault(vault);
              }}
            />
          ))
        )}
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

function collectTags(vaults: Vault[]): string[] {
  const set = new Set<string>();
  for (const v of vaults) {
    for (const t of v.tags ?? []) {
      set.add(t);
    }
  }
  return Array.from(set).sort();
}

function filterVaults(vaults: Vault[], search: string, tag: string): Vault[] {
  const q = search.trim().toLowerCase();
  return vaults.filter((v) => {
    if (tag !== ALL_TAGS && !(v.tags ?? []).includes(tag)) {
      return false;
    }
    if (!q) {
      return true;
    }
    const hay = `${v.name} ${v.directoryPath ?? ""} ${(v.tags ?? []).join(" ")}`.toLowerCase();
    return hay.includes(q);
  });
}
