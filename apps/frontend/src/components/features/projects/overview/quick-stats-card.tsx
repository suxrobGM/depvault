"use client";

import type { ReactElement } from "react";
import {
  Security as AnalysisIcon,
  Inventory2 as DepsIcon,
  Group as GroupIcon,
  TrendingUp as HealthIcon,
} from "@mui/icons-material";
import { Box, CardContent, CardHeader, Grid, Stack, Typography } from "@mui/material";
import { IconBox, Surface } from "@/components/ui/cards";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AnalysisListResponseDto } from "@/types/api/analysis";
import type { MemberListResponseDto } from "@/types/api/project";

interface QuickStatsCardProps {
  projectId: string;
}

interface StatsItem {
  icon: ReactElement;
  value: number | string;
  label: string;
  valueColor?: string;
}

export function QuickStatsCard(props: QuickStatsCardProps): ReactElement {
  const { projectId } = props;

  const { data: membersData } = useApiQuery<MemberListResponseDto>(
    queryKeys.projects.members(projectId),
    () => client.api.projects({ id: projectId }).members.get({ query: { page: 1, limit: 50 } }),
  );

  const { data: analysisData } = useApiQuery<AnalysisListResponseDto>(
    queryKeys.analyses.overview(projectId),
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

  const stats: StatsItem[] = [
    {
      icon: <GroupIcon sx={{ fontSize: 22 }} />,
      value: memberCount,
      label: "Members",
    },
    {
      icon: <AnalysisIcon sx={{ fontSize: 22 }} />,
      value: analysisCount,
      label: "Analyses",
    },
    {
      icon: <DepsIcon sx={{ fontSize: 22 }} />,
      value: totalDeps,
      label: "Dependencies",
    },
    {
      icon: <HealthIcon sx={{ fontSize: 22 }} />,
      value: avgHealth !== null ? `${avgHealth}%` : "\u2014",
      label: "Avg Health",
      valueColor: getHealthColor(),
    },
  ];

  return (
    <Surface sx={{ height: "100%" }}>
      <CardHeader title="Quick Stats" />
      <CardContent sx={{ p: 3 }}>
        <Grid container spacing={2}>
          {stats.map((stat) => (
            <Grid size={6} key={stat.label}>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: "center",
                }}
              >
                <IconBox color="var(--mui-palette-primary-main)" size={40}>
                  {stat.icon}
                </IconBox>
                <Box>
                  <Typography variant="captionMuted">{stat.label}</Typography>
                  <Typography
                    variant="statValue"
                    sx={{ fontSize: "1rem", color: stat.valueColor ?? "text.primary" }}
                  >
                    {stat.value}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Surface>
  );
}
