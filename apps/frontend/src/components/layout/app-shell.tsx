"use client";

import { useState, type PropsWithChildren, type ReactElement } from "react";
import { Box, Toolbar } from "@mui/material";
import { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_WIDTH } from "./constants";
import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";

export function AppShell(props: PropsWithChildren): ReactElement {
  const { children } = props;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", position: "relative" }}>
      <Box className="vault-dot-grid" />
      <TopBar onMenuClick={() => setMobileOpen(true)} sidebarOpen={sidebarOpen} />
      <Sidebar
        open={sidebarOpen}
        mobileOpen={mobileOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH}px)` },
          ml: { md: `${sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH}px` },
          transition: "width 225ms, margin-left 225ms",
          p: 3,
          position: "relative",
          zIndex: 1,
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
