"use client";

import { useState, type ReactElement } from "react";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Share as ShareIcon,
} from "@mui/icons-material";
import { Checkbox, Chip, TableCell, TableRow, Typography } from "@mui/material";
import { CreateShareLinkDialog } from "@/components/features/shared-secret/create-share-link-dialog";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/inputs";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useConfirm } from "@/hooks/use-confirm";
import { client } from "@/lib/api";
import type { EnvVariable } from "@/types/api/env-variable";
import { EncryptedValue } from "./encrypted-value";
import { VaultVariableHistory } from "./vault-variable-history";

export interface VaultVariableRowProps {
  projectId: string;
  vaultId: string;
  variable: EnvVariable;
  canEdit: boolean;
  selected: boolean;
  onToggleSelect?: () => void;
  onEdit?: (variable: EnvVariable) => void;
}

export function VaultVariableRow(props: VaultVariableRowProps): ReactElement {
  const { projectId, vaultId, variable, canEdit, selected, onToggleSelect, onEdit } = props;
  const confirm = useConfirm();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const deleteMutation = useApiMutation(
    () =>
      client.api
        .projects({ id: projectId })
        .vaults({ vaultId })
        .variables({ varId: variable.id })
        .delete(),
    {
      invalidateKeys: [["vault-variables", projectId, vaultId]],
      successMessage: "Variable deleted",
    },
  );

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete Variable",
      description: `Are you sure you want to delete "${variable.key}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (ok) deleteMutation.mutate();
  };

  const actions = buildActionMenuItems({
    canEdit,
    onEdit: () => onEdit?.(variable),
    onShare: () => setShareOpen(true),
    onShowHistory: () => setHistoryOpen(true),
    onDelete: handleDelete,
  });

  const colSpan = canEdit ? 6 : 5;

  return (
    <>
      <TableRow
        hover
        selected={selected}
        sx={{ "& > *": { borderBottom: historyOpen ? "unset" : undefined } }}
      >
        {canEdit && (
          <TableCell padding="checkbox">
            <Checkbox size="small" checked={selected} onChange={onToggleSelect} />
          </TableCell>
        )}
        <TableCell>
          <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
            {variable.key}
          </Typography>
        </TableCell>
        <TableCell>
          <EncryptedValue
            projectId={projectId}
            encryptedValue={variable.encryptedValue}
            iv={variable.iv}
            authTag={variable.authTag}
          />
        </TableCell>
        <TableCell>
          <Typography variant="body2" noWrap sx={{ color: "text.secondary", maxWidth: 200 }}>
            {variable.description ?? "—"}
          </Typography>
        </TableCell>
        <TableCell align="center">
          {variable.isRequired && (
            <Chip label="Required" size="small" color="warning" variant="outlined" />
          )}
        </TableCell>
        <TableCell align="right">
          <ActionMenu items={actions} />
        </TableCell>
      </TableRow>

      <VaultVariableHistory
        projectId={projectId}
        vaultId={vaultId}
        variableId={variable.id}
        canEdit={canEdit}
        colSpan={colSpan}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />

      <CreateShareLinkDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        projectId={projectId}
        variables={[variable]}
      />
    </>
  );
}

interface ActionBuilderArgs {
  canEdit: boolean;
  onEdit: () => void;
  onShare: () => void;
  onShowHistory: () => void;
  onDelete: () => void;
}

function buildActionMenuItems(args: ActionBuilderArgs): ActionMenuItem[] {
  const { canEdit, onEdit, onShare, onShowHistory, onDelete } = args;
  return [
    {
      label: "Edit",
      icon: <EditIcon fontSize="small" />,
      onClick: onEdit,
      hidden: !canEdit,
    },
    {
      label: "Share",
      icon: <ShareIcon fontSize="small" />,
      onClick: onShare,
      hidden: !canEdit,
    },
    {
      label: "Version History",
      icon: <HistoryIcon fontSize="small" />,
      onClick: onShowHistory,
    },
    {
      label: "Delete",
      icon: <DeleteIcon fontSize="small" />,
      onClick: onDelete,
      hidden: !canEdit,
      destructive: true,
    },
  ];
}
