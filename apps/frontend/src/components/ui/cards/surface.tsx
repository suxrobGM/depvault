"use client";

import type { ElementType, ReactElement, ReactNode } from "react";
import { Card, type CardProps } from "@mui/material";

export type SurfaceAccent = "primary" | "secondary" | "success" | "error" | "warning" | "info";

type SurfaceProps = Omit<CardProps, "component"> & {
  children?: ReactNode;
  /** Tints the border and the hover glow with a palette color. */
  accent?: SurfaceAccent;
  /** Adds a pointer cursor and a lift-on-hover transition for clickable cards. */
  interactive?: boolean;
  component?: ElementType;
  href?: string;
};

const ACCENT_CHANNEL: Record<SurfaceAccent, string> = {
  primary: "var(--mui-palette-primary-mainChannel)",
  secondary: "var(--mui-palette-secondary-mainChannel)",
  success: "var(--mui-palette-success-mainChannel)",
  error: "var(--mui-palette-error-mainChannel)",
  warning: "var(--mui-palette-warning-mainChannel)",
  info: "var(--mui-palette-info-mainChannel)",
};

/**
 * The single card container primitive. Renders a themed MUI `Card`: the base look
 * (glass background, border, radius, blur, transition) comes from the `MuiCard`
 * theme override, so `Surface` only layers on the accent tint and hover behavior.
 */
export function Surface(props: SurfaceProps): ReactElement {
  const { children, accent, interactive, sx, ...rest } = props;
  const channel = ACCENT_CHANNEL[accent ?? "primary"];
  const showHover = accent != null || interactive;

  return (
    <Card
      {...rest}
      sx={[
        (theme) => ({
          ...(accent && { borderColor: `rgba(${channel} / 0.2)` }),
          ...(interactive && { cursor: "pointer" }),
          ...(showHover && {
            "&:hover": {
              borderColor: `rgba(${channel} / 0.4)`,
              boxShadow: theme.app.glow.hover(channel),
              ...(interactive && { transform: "translateY(-2px)" }),
            },
          }),
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Card>
  );
}
