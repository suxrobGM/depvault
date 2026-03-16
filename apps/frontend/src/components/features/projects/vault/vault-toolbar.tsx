"use client";

import type { ReactElement } from "react";
import {
  Add as AddIcon,
  CompareArrows as CompareIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FileDownload as ExportIcon,
  FolderZip as FolderZipIcon,
  FileUpload as ImportIcon,
  Share as ShareIcon,
  Sync as SyncIcon,
} from "@mui/icons-material";
import { Button, Stack } from "@mui/material";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/inputs";

interface VaultToolbarProps {
  canEdit?: boolean;
  hasEnvironment?: boolean;
  hasVariables?: boolean;
  onCreateVariable?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  onCompare?: () => void;
  onSync?: () => void;
  onShare?: () => void;
  onBundle?: () => void;
  onEditGroup?: () => void;
  onDeleteGroup?: () => void;
}

export function VaultToolbar(props: VaultToolbarProps): ReactElement {
  const {
    canEdit,
    hasEnvironment,
    hasVariables,
    onCreateVariable,
    onImport,
    onExport,
    onCompare,
    onSync,
    onShare,
    onBundle,
    onEditGroup,
    onDeleteGroup,
  } = props;

  const menuItems: ActionMenuItem[] = [
    {
      label: "Export",
      icon: <ExportIcon fontSize="small" />,
      onClick: () => onExport?.(),
      hidden: !hasEnvironment,
    },
    {
      label: "Sync",
      icon: <SyncIcon fontSize="small" />,
      onClick: () => onSync?.(),
      hidden: !canEdit || !hasEnvironment,
    },
    {
      label: "Share",
      icon: <ShareIcon fontSize="small" />,
      onClick: () => onShare?.(),
      hidden: !canEdit || !hasVariables,
    },
    {
      label: "Download Bundle",
      icon: <FolderZipIcon fontSize="small" />,
      onClick: () => onBundle?.(),
      hidden: !canEdit || !hasEnvironment,
    },
    {
      label: "Compare",
      icon: <CompareIcon fontSize="small" />,
      onClick: () => onCompare?.(),
    },
    {
      label: "Edit Group",
      icon: <EditIcon fontSize="small" />,
      onClick: () => onEditGroup?.(),
      hidden: !canEdit,
      dividerBefore: true,
    },
    {
      label: "Delete Group",
      icon: <DeleteIcon fontSize="small" />,
      onClick: () => onDeleteGroup?.(),
      hidden: !canEdit,
      destructive: true,
    },
  ];

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {canEdit && (
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={onCreateVariable}>
          New Variable
        </Button>
      )}
      {canEdit && (
        <Button variant="outlined" size="small" startIcon={<ImportIcon />} onClick={onImport}>
          Import
        </Button>
      )}
      <ActionMenu items={menuItems} />
    </Stack>
  );
}
