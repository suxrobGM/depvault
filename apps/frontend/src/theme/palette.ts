import type { PaletteOptions } from "@mui/material/styles";
import { appStyleTokens } from "./style-tokens";

export const palette: PaletteOptions = {
  mode: "dark",
  primary: { main: "#10b981", light: "#34d399", dark: "#059669", contrastText: "#fff" },
  secondary: { main: "#f59e0b", light: "#fbbf24", dark: "#d97706" },
  error: { main: "#f87171", light: "#fca5a5", dark: "#dc2626" },
  warning: { main: "#fbbf24", light: "#fde68a", dark: "#f59e0b" },
  success: { main: "#34d399", light: "#6ee7b7", dark: "#10b981" },
  info: { main: "#22d3ee", light: "#67e8f9", dark: "#06b6d4" },
  background: { default: appStyleTokens.surface.base, paper: appStyleTokens.surface.raised },
  text: { primary: "#f1f5f9", secondary: "#94a3b8" },
  divider: "rgba(255, 255, 255, 0.08)",
  vault: {
    surface: appStyleTokens.surface.elevated,
    glassBg: "rgba(22, 28, 46, 0.6)",
    glassBorder: "rgba(255, 255, 255, 0.08)",
    glowPrimary: "rgba(16, 185, 129, 0.15)",
    glowSecondary: "rgba(245, 158, 11, 0.15)",
  },
};
