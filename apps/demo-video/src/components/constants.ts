import { interpolate } from "remotion";

// Palette — from apps/frontend/src/theme/theme.ts
export const colors = {
  primary: "#10b981",
  primaryLight: "#34d399",
  primaryDark: "#059669",
  secondary: "#f59e0b",
  error: "#f87171",
  warning: "#fbbf24",
  success: "#34d399",
  info: "#22d3ee",
  bg: "#0a0e17",
  paper: "#0f1420",
  surface: "#161c2e",
  textPrimary: "#f1f5f9",
  textSecondary: "#94a3b8",
  divider: "rgba(255, 255, 255, 0.08)",
  glassBg: "rgba(22, 28, 46, 0.6)",
  glassBorder: "rgba(255, 255, 255, 0.08)",
  glowPrimary: "rgba(16, 185, 129, 0.15)",
  glowSecondary: "rgba(245, 158, 11, 0.15)",
  purple: "#a78bfa",
} as const;

// CLI colors — from apps/cli/Output/ConsoleTheme.cs
export const cli = {
  cyan: "#00ffff",
  grey: "#808080",
  brand: "#10b981",
  green: "#00ff00",
  red: "#ff0000",
  yellow: "#e0af68",
  text: "#a9b1d6",
  muted: "#636a80",
  termBg: "#1a1b26",
  termTitleBg: "#16161e",
} as const;

// Typography — from theme.typography
export const fonts = {
  display: "'Syne', 'Inter', sans-serif",
  body: "'Inter', 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
} as const;

export const BORDER_RADIUS = 10;

// Animation helpers
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const fade = (frame: number, start: number, dur = 8): React.CSSProperties => ({
  opacity: interpolate(frame, [start, start + dur], [0, 1], clamp),
});

export const fadeUp = (frame: number, delay: number, dur = 12): React.CSSProperties => ({
  opacity: interpolate(frame, [delay, delay + dur], [0, 1], clamp),
  transform: `translateY(${interpolate(frame, [delay, delay + dur], [14, 0], clamp)}px)`,
});

export const alpha = (hex: string, a: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};
