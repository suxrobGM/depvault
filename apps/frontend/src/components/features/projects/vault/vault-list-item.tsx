"use client";

import type { ReactElement } from "react";
import { MoreVert as MoreIcon } from "@mui/icons-material";
import { IconButton, ListItem, ListItemButton, Stack, Tooltip, Typography } from "@mui/material";
import type { Vault } from "@/types/api/vault";
import { VaultTagChip } from "./vault-tag-chip";

interface VaultListItemProps {
  vault: Vault;
  canEdit: boolean;
  selected: boolean;
  onSelect: () => void;
  onOpenMenu: (target: HTMLElement) => void;
}

export function VaultListItem(props: VaultListItemProps): ReactElement {
  const { vault, canEdit, selected, onSelect, onOpenMenu } = props;

  const requiredTotal = Number(vault.requiredTotal ?? 0);
  const requiredFilled = Number(vault.requiredFilled ?? 0);
  const variableCount = Number(vault.variableCount ?? 0);
  const secretFileCount = Number(vault.secretFileCount ?? 0);
  const tags = vault.tags ?? [];
  const ratioColor = resolveRatioColor(requiredTotal, requiredFilled);

  return (
    <Tooltip
      title={
        <VaultTooltipContent
          vault={vault}
          variableCount={variableCount}
          secretFileCount={secretFileCount}
        />
      }
      placement="right"
      arrow
    >
      <ListItem
        disablePadding
        secondaryAction={
          canEdit ? (
            <IconButton
              edge="end"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onOpenMenu(e.currentTarget);
              }}
            >
              <MoreIcon fontSize="small" />
            </IconButton>
          ) : null
        }
      >
        <ListItemButton selected={selected} onClick={onSelect} sx={{ py: 0.75 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ width: "100%", alignItems: "center", minWidth: 0 }}
          >
            <Typography
              variant="body2"
              noWrap
              sx={{ fontWeight: 600, flexShrink: 0, maxWidth: "45%" }}
            >
              {vault.name}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              {tags.slice(0, 2).map((tag) => (
                <VaultTagChip key={tag} tag={tag} compact />
              ))}
              {tags.length > 2 && (
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  +{tags.length - 2}
                </Typography>
              )}
            </Stack>
            <Typography
              variant="caption"
              sx={{
                color: ratioColor,
                fontVariantNumeric: "tabular-nums",
                fontWeight: 500,
                flexShrink: 0,
              }}
            >
              {requiredTotal > 0 ? `${requiredFilled}/${requiredTotal}` : variableCount}
            </Typography>
          </Stack>
        </ListItemButton>
      </ListItem>
    </Tooltip>
  );
}

function resolveRatioColor(required: number, filled: number): string {
  if (required === 0) return "text.secondary";
  if (filled === required) return "success.main";
  if (filled === 0) return "error.main";
  return "warning.main";
}

interface VaultTooltipContentProps {
  vault: Vault;
  variableCount: number;
  secretFileCount: number;
}

function VaultTooltipContent(props: VaultTooltipContentProps): ReactElement {
  const { vault, variableCount, secretFileCount } = props;
  const counts = `${variableCount} variables · ${secretFileCount} files`;

  if (!vault.directoryPath) {
    return <Typography variant="caption">{counts}</Typography>;
  }

  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
        {vault.directoryPath}
      </Typography>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {counts}
      </Typography>
    </Stack>
  );
}
