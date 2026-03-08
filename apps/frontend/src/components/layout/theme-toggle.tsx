"use client";

import type { ReactElement } from "react";
import { DarkMode as DarkModeIcon, LightMode as LightModeIcon } from "@mui/icons-material";
import { Fade, IconButton, Tooltip } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";

export function ThemeToggle(): ReactElement | null {
  const { mode, setMode } = useColorScheme();

  if (!mode) return null;

  const isDark = mode === "dark";

  return (
    <Tooltip title={isDark ? "Light mode" : "Dark mode"}>
      <IconButton
        onClick={() => setMode(isDark ? "light" : "dark")}
        color="inherit"
        sx={{
          transition: "transform 0.3s ease",
          "&:hover": { transform: "rotate(30deg)" },
        }}
      >
        <Fade in={isDark} timeout={300} unmountOnExit>
          <LightModeIcon sx={{ position: "absolute" }} />
        </Fade>
        <Fade in={!isDark} timeout={300} unmountOnExit>
          <DarkModeIcon />
        </Fade>
      </IconButton>
    </Tooltip>
  );
}
