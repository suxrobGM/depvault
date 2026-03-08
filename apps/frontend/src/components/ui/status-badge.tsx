import type { ReactElement } from "react";
import { Chip } from "@mui/material";

type StatusVariant = "success" | "warning" | "error" | "info" | "default";

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  size?: "small" | "medium";
}

const colorMap: Record<StatusVariant, "success" | "warning" | "error" | "info" | "default"> = {
  success: "success",
  warning: "warning",
  error: "error",
  info: "info",
  default: "default",
};

export function StatusBadge(props: StatusBadgeProps): ReactElement {
  const { label, variant = "default", size = "small" } = props;

  return <Chip label={label} color={colorMap[variant]} size={size} />;
}
