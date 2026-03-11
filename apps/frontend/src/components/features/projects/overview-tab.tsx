"use client";

import type { ReactElement } from "react";
import {
  Security as AnalysisIcon,
  ArrowForward as ArrowForwardIcon,
  CalendarToday as CalendarIcon,
  Inventory2 as DepsIcon,
  GitHub as GitHubIcon,
  Group as GroupIcon,
  TrendingUp as HealthIcon,
  OpenInNew as OpenInNewIcon,
  Update as UpdateIcon,
  VpnKey as VpnKeyIcon,
} from "@mui/icons-material";
import { Box, Button, CardContent, Grid, Stack, Typography } from "@mui/material";
import type { Route } from "next";
import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";
import { IconBox } from "@/components/ui/icon-box";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { AnalysisListResponse } from "@/types/api/analysis";
import type { ProjectResponse } from "@/types/api/project";
import type { VaultGroupListResponse } from "@/types/api/vault-group";

interface OverviewTabProps {
  project: ProjectResponse;
  projectId: string;
  memberCount: number;
}

export function OverviewTab(props: OverviewTabProps): ReactElement {
  const { project, projectId, memberCount } = props;

  const { data: analysisData } = useApiQuery<AnalysisListResponse>(
    ["analyses", projectId, "overview"],
    () => client.api.analyses.project({ projectId }).get({ query: { page: 1, limit: 100 } }),
  );

  const { data: vaultGroups } = useApiQuery<VaultGroupListResponse>(
    ["vault-groups", projectId, "overview"],
    () => client.api.projects({ id: projectId })["vault-groups"].get(),
  );

  const vaultGroupCount = vaultGroups?.length ?? 0;
  const totalVariableCount = vaultGroups?.reduce((sum, g) => sum + (g.variableCount ?? 0), 0) ?? 0;

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
      value: avgHealth !== null ? `${avgHealth}%` : "—",
      label: "Avg Health",
    },
  ];

  return (
    <Grid container spacing={3} className="vault-fade-up vault-delay-2">
      <Grid size={{ xs: 12, md: 8 }}>
        <GlassCard sx={{ height: "100%" }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              About
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {project.description || "No description provided."}
            </Typography>
            {project.repositoryUrl && (
              <Button
                component="a"
                href={project.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
                size="small"
                startIcon={
                  project.repositoryUrl.includes("github.com") ? <GitHubIcon /> : <OpenInNewIcon />
                }
              >
                View Repository
              </Button>
            )}
            <Stack spacing={1.5} sx={{ mt: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CalendarIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary">
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <UpdateIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary">
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </GlassCard>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
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
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <GlassCard sx={{ height: "100%" }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
              <IconBox color="var(--mui-palette-success-main)" size={40}>
                <VpnKeyIcon sx={{ fontSize: 22 }} />
              </IconBox>
              <Typography variant="subtitle1" fontWeight={600}>
                Vault Summary
              </Typography>
            </Stack>
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">
                  Vault Groups
                </Typography>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                  {vaultGroupCount}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">
                  Total Variables
                </Typography>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                  {totalVariableCount}
                </Typography>
              </Grid>
            </Grid>
            <Button
              component={Link}
              href={ROUTES.projectVault(projectId) as Route}
              variant="outlined"
              size="small"
              endIcon={<ArrowForwardIcon />}
            >
              Go to Vault
            </Button>
          </CardContent>
        </GlassCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <GlassCard sx={{ height: "100%" }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
              <IconBox color="var(--mui-palette-info-main)" size={40}>
                <AnalysisIcon sx={{ fontSize: 22 }} />
              </IconBox>
              <Typography variant="subtitle1" fontWeight={600}>
                Analysis Summary
              </Typography>
            </Stack>
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
              <Grid size={4}>
                <Typography variant="caption" color="text.secondary">
                  Analyses
                </Typography>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                  {analysisCount}
                </Typography>
              </Grid>
              <Grid size={4}>
                <Typography variant="caption" color="text.secondary">
                  Dependencies
                </Typography>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                  {totalDeps}
                </Typography>
              </Grid>
              <Grid size={4}>
                <Typography variant="caption" color="text.secondary">
                  Avg Health
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  lineHeight={1.2}
                  sx={{ color: avgHealth !== null ? getHealthColor() : "text.secondary" }}
                >
                  {avgHealth !== null ? `${avgHealth}%` : "\u2014"}
                </Typography>
              </Grid>
            </Grid>
            <Button
              component={Link}
              href={ROUTES.projectAnalysis(projectId) as Route}
              variant="outlined"
              size="small"
              endIcon={<ArrowForwardIcon />}
            >
              Go to Analysis
            </Button>
          </CardContent>
        </GlassCard>
      </Grid>
    </Grid>
  );
}
