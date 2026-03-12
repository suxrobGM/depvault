"use client";

import type { ReactElement, ReactNode } from "react";
import {
  BugReport as BugIcon,
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  Update as UpdateIcon,
} from "@mui/icons-material";
import { CardContent, Grid, Typography } from "@mui/material";
import { GlassCard } from "@/components/ui/glass-card";
import { IconBox } from "@/components/ui/icon-box";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Dependency } from "@/types/api/analysis";
import { getHealthColor } from "./analysis-utils";

interface AnalysisSummaryStatsProps {
  dependencies: Dependency[];
  healthScore: number | null;
}

interface StatItem {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  color: string;
}

export function AnalysisSummaryStats(props: AnalysisSummaryStatsProps): ReactElement {
  const { dependencies, healthScore } = props;

  const totalDeps = dependencies.length;
  const outdatedCount = dependencies.filter(
    (d) => d.status === "MINOR_UPDATE" || d.status === "MAJOR_UPDATE",
  ).length;
  const vulnerableCount = dependencies.filter((d) => d.vulnerabilities.length > 0).length;

  const stats: StatItem[] = [
    {
      icon: <InventoryIcon />,
      label: "Total Dependencies",
      value: totalDeps,
      color: "var(--mui-palette-primary-main)",
    },
    {
      icon: <UpdateIcon />,
      label: "Outdated",
      value: outdatedCount,
      color: "var(--mui-palette-warning-main)",
    },
    {
      icon: <BugIcon />,
      label: "Vulnerable",
      value: vulnerableCount,
      color: "var(--mui-palette-error-main)",
    },
    {
      icon: <TrendingUpIcon />,
      label: "Health Score",
      value: (
        <StatusBadge
          label={healthScore !== null ? `${healthScore}%` : "N/A"}
          variant={getHealthColor(healthScore)}
          glow
        />
      ),
      color: "var(--mui-palette-success-main)",
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
              {typeof stat.value === "number" ? (
                <Typography variant="h4" fontWeight={700} sx={{ mb: 0.25, ml: 1 }}>
                  {stat.value}
                </Typography>
              ) : (
                stat.value
              )}
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
