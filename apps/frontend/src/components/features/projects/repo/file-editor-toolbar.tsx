"use client";

import { type ReactElement } from "react";
import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
} from "@mui/icons-material";
import { Box, Chip, Stack, Typography } from "@mui/material";
import type { RepoFileContentDto } from "@/api/types/repo";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/inputs";
import { formatBytes, formatRelativeTime } from "@/utils/formatters";
import { resolveLanguage } from "./file-format";

interface FileEditorToolbarProps {
  content: RepoFileContentDto;
  canEdit: boolean;
  onDownload: () => void;
  downloading: boolean;
  onShare: () => void;
  shareDisabled: boolean;
  onDelete: () => void;
  deleting: boolean;
}

/** Metadata strip + action menu for the active file in the editor pane. */
export function FileEditorToolbar(props: FileEditorToolbarProps): ReactElement {
  const { content, canEdit, onDownload, downloading, onShare, shareDisabled, onDelete, deleting } =
    props;

  const isSecret = content.kind === "SECRET";
  const language = resolveLanguage(content.format, content.relativePath);

  const actions: ActionMenuItem[] = [
    {
      label: downloading ? "Downloading…" : "Download",
      icon: <DownloadIcon fontSize="small" />,
      onClick: onDownload,
      disabled: downloading,
    },
    {
      label: "Share via link",
      icon: <ShareIcon fontSize="small" />,
      onClick: onShare,
      disabled: shareDisabled,
    },
    {
      label: "Delete",
      icon: <DeleteIcon fontSize="small" />,
      onClick: onDelete,
      destructive: true,
      hidden: !canEdit,
      disabled: deleting,
      dividerBefore: true,
    },
  ];

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
      <Typography variant="subtitle1" sx={{ fontFamily: "monospace", fontWeight: 600 }} noWrap>
        {content.relativePath}
      </Typography>
      <Chip
        size="small"
        label={isSecret ? "Secret" : "Config"}
        color={isSecret ? "warning" : "info"}
        variant="outlined"
      />
      {content.environmentSlug && (
        <Chip size="small" label={content.environmentSlug} variant="outlined" />
      )}
      <Chip
        size="small"
        label={isSecret ? (content.mimeType ?? "binary") : language.toUpperCase()}
        variant="outlined"
      />

      <Box sx={{ flex: 1 }} />

      <Typography variant="captionMuted">
        {formatBytes(content.fileSize)} · {formatRelativeTime(content.updatedAt)}
      </Typography>
      <ActionMenu items={actions} />
    </Stack>
  );
}
