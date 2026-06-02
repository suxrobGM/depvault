"use client";

import { type ReactElement } from "react";
import {
  Lock as BinaryIcon,
  Description as ConfigIcon,
  VpnKey as SecretIcon,
} from "@mui/icons-material";
import {
  Chip,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import type { RepoMapFileDto } from "@/types/api/repo";
import { formatBytes } from "@/utils/formatters";

interface FileListProps {
  files: RepoMapFileDto[];
  selectedFileId: string | null;
  onSelect: (fileId: string) => void;
}

/** A single file list across both kinds — each row carries a Config/Secret badge. */
export function FileList(props: FileListProps): ReactElement {
  const { files, selectedFileId, onSelect } = props;

  if (files.length === 0) {
    return (
      <Typography variant="body2Muted" sx={{ px: 1, py: 2 }}>
        No files in this environment.
      </Typography>
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <List disablePadding dense>
        {files.map((file) => {
          const isSecret = file.kind === "SECRET";
          const detail = file.format?.toUpperCase() ?? file.mimeType ?? (isSecret ? "Secret" : "");
          return (
            <ListItemButton
              key={file.id}
              selected={file.id === selectedFileId}
              onClick={() => onSelect(file.id)}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {file.isBinary ? (
                  <BinaryIcon fontSize="small" />
                ) : isSecret ? (
                  <SecretIcon fontSize="small" />
                ) : (
                  <ConfigIcon fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={file.relativePath}
                secondary={
                  <Stack
                    direction="row"
                    spacing={0.75}
                    sx={{ alignItems: "center", mt: 0.25, flexWrap: "wrap", rowGap: 0.5 }}
                  >
                    <Chip
                      size="small"
                      label={isSecret ? "Secret" : "Config"}
                      color={isSecret ? "warning" : "info"}
                      variant="outlined"
                      sx={{ height: 18, fontSize: "0.6rem" }}
                    />
                    <Typography variant="captionMuted" component="span">
                      {[detail, formatBytes(file.fileSize)].filter(Boolean).join(" · ")}
                    </Typography>
                  </Stack>
                }
                slotProps={{
                  primary: { sx: { fontFamily: "monospace", fontSize: "0.82rem" }, noWrap: true },
                  secondary: { component: "div" },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Paper>
  );
}
