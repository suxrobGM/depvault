"use client";

import type { ReactElement } from "react";
import { Chip, type ChipProps } from "@mui/material";

/** Colors reserved for the four conventional environment tags. */
const BLESSED_TAGS: Record<string, string> = {
  prod: "#ef4444",
  staging: "#eab308",
  dev: "#10b981",
  preview: "#6366f1",
};

interface VaultTagChipProps {
  tag: string;
  active?: boolean;
  compact?: boolean;
  onClick?: ChipProps["onClick"];
}

export function VaultTagChip(props: VaultTagChipProps): ReactElement {
  const { tag, active = true, compact = false, onClick } = props;
  const color = BLESSED_TAGS[tag.toLowerCase()];

  const compactSx = compact ? { height: 18, fontSize: "0.65rem" } : {};

  if (!color) {
    return (
      <Chip
        label={tag}
        size="small"
        variant={active ? "filled" : "outlined"}
        onClick={onClick}
        sx={compactSx}
      />
    );
  }

  return (
    <Chip
      label={tag}
      size="small"
      variant={active ? "filled" : "outlined"}
      onClick={onClick}
      sx={{
        ...compactSx,
        ...(active
          ? { bgcolor: color, color: "#fff", borderColor: color }
          : { borderColor: `${color}80`, color }),
      }}
    />
  );
}
