"use client";

import type { ReactElement, ReactNode } from "react";
import {
  BugReport as BugIcon,
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  Update as UpdateIcon,
} from "@mui/icons-material";
import { CardContent, Grid, Typography } from "@mui/material";
import { IconBox, Surface, type SurfaceAccent } from "@/components/ui/cards";
import { StatusBadge } from "@/components/ui/data-display";
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
  accent: SurfaceAccent;
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
      accent: "primary",
    },
    {
      icon: <UpdateIcon />,
      label: "Outdated",
      value: outdatedCount,
      accent: "warning",
    },
    {
      icon: <BugIcon />,
      label: "Vulnerable",
      value: vulnerableCount,
      accent: "error",
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
      accent: "success",
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
              {typeof stat.value === "number" ? (
                <Typography
                  variant="statValue"
                  sx={{
                    mb: 0.25,
                    ml: 1,
                  }}
                >
                  {stat.value}
                </Typography>
              ) : (
                stat.value
              )}
              <Typography
                variant="body2Muted"
                sx={{
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
