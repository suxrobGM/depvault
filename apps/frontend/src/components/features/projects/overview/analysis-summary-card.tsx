"use client";

import type { ReactElement } from "react";
import { Security as AnalysisIcon, ArrowForward as ArrowForwardIcon } from "@mui/icons-material";
import { CardActions, CardContent, CardHeader, Grid, Typography } from "@mui/material";
import { IconBox, Surface } from "@/components/ui/cards";
import { LinkButton } from "@/components/ui/inputs";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { AnalysisListResponse } from "@/types/api/analysis";

interface AnalysisSummaryCardProps {
  projectId: string;
}

function getHealthColor(avgHealth: number | null) {
  if (avgHealth === null || avgHealth < 50) return "var(--mui-palette-error-main)";
  if (avgHealth < 80) return "var(--mui-palette-warning-main)";
  return "var(--mui-palette-success-main)";
}

export function AnalysisSummaryCard(props: AnalysisSummaryCardProps): ReactElement {
  const { projectId } = props;

  const { data: analysisData } = useApiQuery<AnalysisListResponse>(
    ["analyses", projectId, "overview"],
    () => client.api.projects({ id: projectId }).analyses.get({ query: { page: 1, limit: 100 } }),
  );

  const analysisCount = analysisData?.pagination.total ?? 0;
  const totalDeps = analysisData?.items.reduce((sum, a) => sum + a.dependencyCount, 0) ?? 0;

  const healthScores =
    analysisData?.items.map((a) => a.healthScore).filter((s): s is number => s !== null) ?? [];

  const avgHealth =
    healthScores.length > 0
      ? Math.round(healthScores.reduce((sum, s) => sum + s, 0) / healthScores.length)
      : null;

  return (
    <Surface accent="primary" sx={{ height: "100%" }}>
      <CardHeader
        avatar={
          <IconBox color="var(--mui-palette-primary-main)" size={40}>
            <AnalysisIcon sx={{ fontSize: 22 }} />
          </IconBox>
        }
        title="Analysis Summary"
      />
      <CardContent sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid size={4}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
              }}
            >
              Analyses
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {analysisCount}
            </Typography>
          </Grid>
          <Grid size={4}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
              }}
            >
              Dependencies
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {totalDeps}
            </Typography>
          </Grid>
          <Grid size={4}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
              }}
            >
              Avg Health
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                lineHeight: 1.2,
                color: avgHealth !== null ? getHealthColor(avgHealth) : "text.secondary",
              }}
            >
              {avgHealth !== null ? `${avgHealth}%` : "\u2014"}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
      <CardActions>
        <LinkButton
          href={ROUTES.projectAnalysis(projectId)}
          variant="outlined"
          size="small"
          endIcon={<ArrowForwardIcon />}
        >
          Go to Analysis
        </LinkButton>
      </CardActions>
    </Surface>
  );
}
