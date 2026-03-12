"use client";

import type { ReactElement } from "react";
import {
  Security as AnalysisIcon,
  Inventory2 as DepsIcon,
  Group as GroupIcon,
  TrendingUp as HealthIcon,
} from "@mui/icons-material";
import { Box, CardContent, Grid, Stack, Typography } from "@mui/material";
import { GlassCard } from "@/components/ui/glass-card";
import { IconBox } from "@/components/ui/icon-box";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { AnalysisListResponse } from "@/types/api/analysis";
import type { MemberListResponse } from "@/types/api/project";

interface QuickStatsCardProps {
  projectId: string;
}

export function QuickStatsCard(props: QuickStatsCardProps): ReactElement {
  const { projectId } = props;

  const { data: membersData } = useApiQuery<MemberListResponse>(
    ["projects", projectId, "members"],
    () => client.api.projects({ id: projectId }).members.get({ query: { page: 1, limit: 50 } }),
  );

  const { data: analysisData } = useApiQuery<AnalysisListResponse>(
    ["analyses", projectId, "overview"],
    () => client.api.projects({ id: projectId }).analyses.get({ query: { page: 1, limit: 100 } }),
  );

  const memberCount = membersData?.pagination.total ?? 0;
  const analysisCount = analysisData?.pagination.total ?? 0;
  const totalDeps = analysisData?.items.reduce((sum, a) => sum + a.dependencyCount, 0) ?? 0;
  const healthScores =
    analysisData?.items.map((a) => a.healthScore).filter((s): s is number => s !== null) ?? [];
  const avgHealth =
    healthScores.length > 0
      ? Math.round(healthScores.reduce((sum, s) => sum + s, 0) / healthScores.length)
      : null;

  const getHealthColor = () => {
    if (avgHealth === null || avgHealth < 50) return "var(--mui-palette-error-main)";
    if (avgHealth < 80) return "var(--mui-palette-warning-main)";
    return "var(--mui-palette-success-main)";
  };

  const stats = [
    {
      icon: <GroupIcon sx={{ fontSize: 22 }} />,
      color: "var(--mui-palette-primary-main)",
      value: memberCount,
      label: "Members",
    },
    {
      icon: <AnalysisIcon sx={{ fontSize: 22 }} />,
      color: "var(--mui-palette-info-main)",
      value: analysisCount,
      label: "Analyses",
    },
    {
      icon: <DepsIcon sx={{ fontSize: 22 }} />,
      color: "var(--mui-palette-warning-main)",
      value: totalDeps,
      label: "Dependencies",
    },
    {
      icon: <HealthIcon sx={{ fontSize: 22 }} />,
      color: getHealthColor(),
      value: avgHealth !== null ? `${avgHealth}%` : "\u2014",
      label: "Avg Health",
    },
  ];

  return (
    <GlassCard sx={{ height: "100%" }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          Quick Stats
        </Typography>
        <Grid container spacing={2}>
          {stats.map((stat) => (
            <Grid size={6} key={stat.label}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <IconBox color={stat.color} size={40}>
                  {stat.icon}
                </IconBox>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {stat.label}
                  </Typography>
                  <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                    {stat.value}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </GlassCard>
  );
}
