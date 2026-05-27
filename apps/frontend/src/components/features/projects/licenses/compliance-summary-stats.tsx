"use client";

import type { ReactElement, ReactNode } from "react";
import {
  Block as BlockIcon,
  CheckCircle as CheckIcon,
  Inventory as TotalIcon,
  Warning as WarnIcon,
} from "@mui/icons-material";
import { CardContent, Grid, Typography } from "@mui/material";
import { IconBox, Surface, type SurfaceAccent } from "@/components/ui/cards";

interface ComplianceSummaryStatsProps {
  total: number;
  allowed: number;
  warned: number;
  blocked: number;
}

interface StatItem {
  icon: ReactNode;
  label: string;
  value: number;
  accent: SurfaceAccent;
}

export function ComplianceSummaryStats(props: ComplianceSummaryStatsProps): ReactElement {
  const { total, allowed, warned, blocked } = props;

  const stats: StatItem[] = [
    {
      icon: <TotalIcon />,
      label: "Total Dependencies",
      value: total,
      accent: "primary",
    },
    {
      icon: <CheckIcon />,
      label: "Allowed",
      value: allowed,
      accent: "success",
    },
    {
      icon: <WarnIcon />,
      label: "Warned",
      value: warned,
      accent: "warning",
    },
    {
      icon: <BlockIcon />,
      label: "Blocked",
      value: blocked,
      accent: "error",
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {stats.map((stat) => (
        <Grid key={stat.label} size={{ xs: 6, md: 3 }}>
          <Surface accent={stat.accent} sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <IconBox color={`var(--mui-palette-${stat.accent}-main)`} size={36} sx={{ mb: 1 }}>
                {stat.icon}
              </IconBox>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  mb: 0.25,
                  ml: 1,
                }}
              >
                {stat.value}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  ml: 1,
                }}
              >
                {stat.label}
              </Typography>
            </CardContent>
          </Surface>
        </Grid>
      ))}
    </Grid>
  );
}
