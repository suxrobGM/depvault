"use client";

import type { ReactElement } from "react";
import { Menu as MenuIcon } from "@mui/icons-material";
import { AppBar, IconButton, Stack, Toolbar, Typography } from "@mui/material";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

interface TopBarProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 64;

export function TopBar(props: TopBarProps): ReactElement {
  const { onMenuClick, sidebarOpen } = props;

  return (
    <AppBar
      position="fixed"
      color="default"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH}px)` },
        ml: { md: `${sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH}px` },
        borderBottom: 1,
        borderColor: "divider",
        transition: "width 225ms, margin-left 225ms",
      }}
    >
      <Toolbar>
        <IconButton edge="start" onClick={onMenuClick} sx={{ mr: 2, display: { md: "none" } }}>
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
          DepVault
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <ThemeToggle />
          <UserMenu />
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
