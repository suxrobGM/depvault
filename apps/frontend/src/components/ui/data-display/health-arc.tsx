"use client";

import type { ReactElement } from "react";
import { Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { getHealthColor } from "@/components/features/projects/analysis/analysis-utils";

interface HealthArcProps {
  score: number | null;
  size?: number;
}

/**
 * A circular health indicator that visually represents a health score as a colored arc.
 */
export function HealthArc(props: HealthArcProps): ReactElement {
  const { score, size = 48 } = props;
  const theme = useTheme();

  if (score === null) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: 2,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: "text.disabled",
            fontWeight: 700,
          }}
        >
          —
        </Typography>
      </Box>
    );
  }

  const variant = getHealthColor(score);
  const colorMap: Record<string, string> = {
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    default: theme.palette.grey[500],
  };
  const color = colorMap[variant] ?? theme.palette.grey[500];
  const center = size / 2;
  const radius = center - 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Box sx={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={alpha(color, 0.15)}
          strokeWidth={3}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 800,
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.7rem",
          color,
        }}
      >
        {score}
      </Typography>
    </Box>
  );
}
