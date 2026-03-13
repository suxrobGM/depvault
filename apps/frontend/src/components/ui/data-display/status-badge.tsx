import type { ReactElement, ReactNode } from "react";
import { Chip } from "@mui/material";

type StatusVariant = "success" | "warning" | "error" | "info" | "default";

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  size?: "small" | "medium";
  icon?: ReactNode;
  glow?: boolean;
}

const colorMap: Record<StatusVariant, "success" | "warning" | "error" | "info" | "default"> = {
  success: "success",
  warning: "warning",
  error: "error",
  info: "info",
  default: "default",
};

const glowMap: Record<StatusVariant, string> = {
  success: "0 0 8px rgba(52, 211, 153, 0.3)",
  warning: "0 0 8px rgba(251, 191, 36, 0.3)",
  error: "0 0 8px rgba(248, 113, 113, 0.3)",
  info: "0 0 8px rgba(34, 211, 238, 0.3)",
  default: "none",
};

export function StatusBadge(props: StatusBadgeProps): ReactElement {
  const { label, variant = "default", size = "small", icon, glow = false } = props;

  return (
    <Chip
      label={label}
      color={colorMap[variant]}
      size={size}
      icon={icon as React.ReactElement | undefined}
      sx={glow ? { boxShadow: glowMap[variant] } : undefined}
    />
  );
}
