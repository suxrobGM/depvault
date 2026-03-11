"use client";

import type { ReactElement } from "react";
import {
  Add as AddIcon,
  ContentCopy as CloneIcon,
  CompareArrows as CompareIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  BookmarkBorder as TemplateIcon,
} from "@mui/icons-material";
import { Button, Stack } from "@mui/material";

interface VaultToolbarProps {
  canEdit: boolean;
  hasEnvironment: boolean;
  onCreateVariable: () => void;
  onImport: () => void;
  onExport: () => void;
  onCompare: () => void;
  onClone: () => void;
  onTemplates: () => void;
}

export function VaultToolbar(props: VaultToolbarProps): ReactElement {
  const {
    canEdit,
    hasEnvironment,
    onCreateVariable,
    onImport,
    onExport,
    onCompare,
    onClone,
    onTemplates,
  } = props;

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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
      {hasEnvironment && (
        <Button variant="outlined" size="small" startIcon={<ExportIcon />} onClick={onExport}>
          Export
        </Button>
      )}
      {canEdit && hasEnvironment && (
        <Button variant="outlined" size="small" startIcon={<CloneIcon />} onClick={onClone}>
          Clone
        </Button>
      )}
      <Button variant="outlined" size="small" startIcon={<CompareIcon />} onClick={onCompare}>
        Compare
      </Button>
      <Button variant="outlined" size="small" startIcon={<TemplateIcon />} onClick={onTemplates}>
        Templates
      </Button>
    </Stack>
  );
}
