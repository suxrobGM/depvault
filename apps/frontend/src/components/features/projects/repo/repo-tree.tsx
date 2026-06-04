"use client";

import { useState, type ReactElement } from "react";
import {
  Lock as BinaryIcon,
  Description as ConfigIcon,
  ExpandLess,
  ExpandMore,
  Folder as FolderIcon,
  VpnKey as SecretIcon,
} from "@mui/icons-material";
import {
  Box,
  Chip,
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import type { RepoMapAppDto, RepoMapFileDto } from "@/types/api/repo";
import { formatBytes } from "@/utils/formatters";
import { basename } from "./file-format";

interface RepoTreeProps {
  apps: RepoMapAppDto[];
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
  /** Force every folder open (e.g. while a search/env filter is active). */
  expandAll?: boolean;
}

/**
 * Collapsible directory → app → file explorer. Replaces the old apps sidebar +
 * file list. Apps are grouped by their `appPath` directory; each app row expands
 * to reveal its (already env/search-filtered) files. Collapse state is tracked
 * locally so it survives re-filtering — every folder starts collapsed except the
 * first, and a folder stays in whatever state the user last toggled it to.
 */
export function RepoTree(props: RepoTreeProps): ReactElement {
  const { apps, selectedFileId, onSelectFile, expandAll = false } = props;
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(apps.slice(1).map((app) => app.id)),
  );

  const toggle = (appId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  };

  const groups = new Map<string, RepoMapAppDto[]>();
  for (const app of apps) {
    const dir = pathDirectory(app.appPath);
    const list = groups.get(dir) ?? [];
    list.push(app);
    groups.set(dir, list);
  }

  if (apps.length === 0) {
    return (
      <Typography variant="body2Muted" sx={{ px: 2, py: 3, display: "block" }}>
        No files match the current filters.
      </Typography>
    );
  }

  return (
    <List disablePadding dense subheader={<li />} sx={{ pb: 1 }}>
      {[...groups.entries()].map(([dir, groupApps]) => (
        <li key={dir}>
          <Typography
            variant="overline"
            sx={{ display: "block", px: 2, pt: 1.5, color: "text.secondary", fontWeight: 600 }}
          >
            {dir}
          </Typography>

          {groupApps.map((app) => {
            const isOpen = expandAll || !collapsed.has(app.id);
            return (
              <Box key={app.id}>
                <ListItemButton onClick={() => toggle(app.id)} sx={{ pr: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <FolderIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={app.name}
                    slotProps={{ primary: { sx: { fontWeight: 500 }, noWrap: true } }}
                  />
                  <Chip size="small" label={app.files.length} sx={{ mr: 0.5 }} />
                  {isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </ListItemButton>

                <Collapse in={isOpen} unmountOnExit>
                  <List disablePadding dense>
                    {app.files.map((file) => (
                      <FileRow
                        key={file.id}
                        file={file}
                        selected={file.id === selectedFileId}
                        onSelect={() => onSelectFile(file.id)}
                      />
                    ))}
                  </List>
                </Collapse>
              </Box>
            );
          })}
        </li>
      ))}
    </List>
  );
}

interface FileRowProps {
  file: RepoMapFileDto;
  selected: boolean;
  onSelect: () => void;
}

function FileRow(props: FileRowProps): ReactElement {
  const { file, selected, onSelect } = props;
  const isSecret = file.kind === "SECRET";
  const detail = file.format?.toUpperCase() ?? file.mimeType ?? (isSecret ? "Secret" : "");
  const fileName = basename(file.relativePath);

  return (
    <ListItemButton selected={selected} onClick={onSelect} sx={{ pl: 4 }}>
      <ListItemIcon sx={{ minWidth: 30 }}>
        {file.isBinary ? (
          <BinaryIcon fontSize="small" />
        ) : isSecret ? (
          <SecretIcon fontSize="small" color="warning" />
        ) : (
          <ConfigIcon fontSize="small" color="info" />
        )}
      </ListItemIcon>
      <ListItemText
        primary={fileName}
        secondary={
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.25 }}
          >
            {file.environmentSlug && (
              <Chip
                size="small"
                label={file.environmentSlug}
                variant="outlined"
                sx={{ height: 16, fontSize: "0.6rem" }}
              />
            )}
            <Typography variant="captionMuted" component="span">
              {[detail, formatBytes(file.fileSize)].filter(Boolean).join(" · ")}
            </Typography>
          </Stack>
        }
        slotProps={{
          primary: { sx: { fontFamily: "monospace", fontSize: "0.8rem" }, noWrap: true },
          secondary: { component: "div" },
        }}
      />
    </ListItemButton>
  );
}

/** Returns the directory portion of an app path, or "/" for a root-level app. */
function pathDirectory(appPath: string): string {
  const normalized = appPath.replace(/\\/g, "/").replace(/\/+$/, "");
  const idx = normalized.lastIndexOf("/");
  if (idx <= 0) return "/";
  return normalized.slice(0, idx);
}
