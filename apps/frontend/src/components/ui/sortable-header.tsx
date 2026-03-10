"use client";

import type { ReactElement } from "react";
import { UnfoldMore as SortIcon } from "@mui/icons-material";
import { Box, Typography } from "@mui/material";

interface SortableHeaderProps {
  field: string;
  label: string;
  activeField: string;
  direction: "asc" | "desc";
  onSort: (field: string) => void;
}

const labelSx = {
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  fontSize: "0.65rem",
} as const;

/**
 * A header component that displays a label and a sort icon. It indicates the active sort field and direction.
 * When clicked, it calls the onSort callback with the field name.
 */
export function SortableHeader(props: SortableHeaderProps): ReactElement {
  const { field, label, activeField, direction, onSort } = props;
  const active = activeField === field;

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onSort(field)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSort(field);
        }
      }}
      sx={{
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 0.25,
        userSelect: "none",
        "&:hover": { color: "text.primary" },
      }}
    >
      <Typography
        variant="caption"
        fontWeight={active ? 700 : 500}
        sx={{ ...labelSx, color: active ? "text.primary" : "text.secondary" }}
      >
        {label}
      </Typography>
      <SortIcon
        sx={{
          fontSize: 14,
          opacity: active ? 1 : 0.3,
          transform: active && direction === "asc" ? "scaleY(-1)" : "none",
          transition: "all 0.15s",
        }}
      />
    </Box>
  );
}
