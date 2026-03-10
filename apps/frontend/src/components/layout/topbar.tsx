"use client";

import type { ReactElement } from "react";
import { Menu as MenuIcon } from "@mui/icons-material";
import { AppBar, Box, IconButton, Toolbar } from "@mui/material";
import { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_WIDTH } from "./constants";
import { UserMenu } from "./user-menu";

interface TopBarProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

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
        transition: "width 225ms, margin-left 225ms",
      }}
    >
      <Toolbar>
        <IconButton
          edge="start"
          onClick={onMenuClick}
          aria-label="Open menu"
          sx={{ mr: 2, display: { md: "none" } }}
        >
          <MenuIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }} />
        <UserMenu />
      </Toolbar>
    </AppBar>
  );
}
