"use client";

import type { ReactElement, ReactNode } from "react";
import {
  Block as BlockIcon,
  CheckCircle as CheckIcon,
  Inventory as TotalIcon,
  Warning as WarnIcon,
} from "@mui/icons-material";
import { CardContent, Grid, Typography } from "@mui/material";
import { GlassCard, IconBox } from "@/components/ui/cards";

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
  color: string;
}

export function ComplianceSummaryStats(props: ComplianceSummaryStatsProps): ReactElement {
  const { total, allowed, warned, blocked } = props;

  const stats: StatItem[] = [
    {
      icon: <TotalIcon />,
      label: "Total Dependencies",
      value: total,
      color: "var(--mui-palette-primary-main)",
    },
    {
      icon: <CheckIcon />,
      label: "Allowed",
      value: allowed,
      color: "var(--mui-palette-success-main)",
    },
    {
      icon: <WarnIcon />,
      label: "Warned",
      value: warned,
      color: "var(--mui-palette-warning-main)",
    },
    {
      icon: <BlockIcon />,
      label: "Blocked",
      value: blocked,
      color: "var(--mui-palette-error-main)",
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {stats.map((stat) => (
        <Grid key={stat.label} size={{ xs: 6, md: 3 }}>
          <GlassCard glowColor={stat.color} sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <IconBox color={stat.color} size={36} sx={{ mb: 1 }}>
                {stat.icon}
              </IconBox>
              <Typography variant="h4" fontWeight={700} sx={{ mb: 0.25, ml: 1 }}>
                {stat.value}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                {stat.label}
              </Typography>
            </CardContent>
          </GlassCard>
        </Grid>
      ))}
    </Grid>
  );
}
