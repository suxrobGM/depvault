"use client";

import { type ReactElement } from "react";
import { Folder as FolderIcon } from "@mui/icons-material";
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
import type { RepoMapAppDto } from "@/types/api/repo";

interface AppsSidebarProps {
  apps: RepoMapAppDto[];
  selectedAppId: string | null;
  onSelect: (appId: string) => void;
}

/** Left pane: apps grouped by their `appPath` directory. */
export function AppsSidebar(props: AppsSidebarProps): ReactElement {
  const { apps, selectedAppId, onSelect } = props;

  const groups = new Map<string, RepoMapAppDto[]>();
  for (const app of apps) {
    const dir = pathDirectory(app.appPath);
    const list = groups.get(dir) ?? [];
    list.push(app);
    groups.set(dir, list);
  }

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <List disablePadding dense subheader={<li />}>
        {[...groups.entries()].map(([dir, groupApps]) => (
          <li key={dir}>
            <Typography
              variant="overline"
              sx={{
                display: "block",
                px: 2,
                pt: 1.5,
                color: "text.secondary",
                fontWeight: 600,
              }}
            >
              {dir}
            </Typography>
            {groupApps.map((app) => {
              const fileCount = app.configFiles.length + app.secretFiles.length;
              return (
                <ListItemButton
                  key={app.id}
                  selected={app.id === selectedAppId}
                  onClick={() => onSelect(app.id)}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <FolderIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={app.name}
                    secondary={
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.25, flexWrap: "wrap" }}>
                        {app.environments.map((env) => (
                          <Chip
                            key={env}
                            size="small"
                            label={env}
                            variant="outlined"
                            sx={{ height: 18, fontSize: "0.65rem" }}
                          />
                        ))}
                      </Stack>
                    }
                    slotProps={{
                      primary: { sx: { fontWeight: 500 }, noWrap: true },
                      secondary: { component: "div" },
                    }}
                  />
                  <Chip size="small" label={fileCount} sx={{ ml: 1 }} />
                </ListItemButton>
              );
            })}
          </li>
        ))}
      </List>
    </Paper>
  );
}

/** Returns the directory portion of an app path, or "/" for a root-level app. */
function pathDirectory(appPath: string): string {
  const normalized = appPath.replace(/\\/g, "/").replace(/\/+$/, "");
  const idx = normalized.lastIndexOf("/");
  if (idx <= 0) return "/";
  return normalized.slice(0, idx);
}
