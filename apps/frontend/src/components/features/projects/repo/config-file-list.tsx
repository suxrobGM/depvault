"use client";

import { type ReactElement } from "react";
import { Lock as BinaryIcon, Description as FileIcon } from "@mui/icons-material";
import { List, ListItemButton, ListItemIcon, ListItemText, Paper, Typography } from "@mui/material";
import type { RepoMapConfigFileDto } from "@/types/api/repo";
import { formatBytes } from "@/utils/formatters";

interface ConfigFileListProps {
  files: RepoMapConfigFileDto[];
  selectedFileId: string | null;
  onSelect: (fileId: string) => void;
}

export function ConfigFileList(props: ConfigFileListProps): ReactElement {
  const { files, selectedFileId, onSelect } = props;

  if (files.length === 0) {
    return (
      <Typography variant="body2Muted" sx={{ px: 1, py: 2 }}>
        No config files in this environment.
      </Typography>
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <List disablePadding dense>
        {files.map((file) => (
          <ListItemButton
            key={file.id}
            selected={file.id === selectedFileId}
            onClick={() => onSelect(file.id)}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {file.isBinary ? <BinaryIcon fontSize="small" /> : <FileIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText
              primary={file.relativePath}
              secondary={`${file.format.toUpperCase()} · ${formatBytes(file.fileSize)}`}
              slotProps={{
                primary: { sx: { fontFamily: "monospace", fontSize: "0.82rem" }, noWrap: true },
                secondary: { variant: "caption" },
              }}
            />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
}
