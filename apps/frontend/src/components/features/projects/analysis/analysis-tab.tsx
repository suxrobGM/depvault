"use client";

import { useState, type ReactElement } from "react";
import {
  Add as AddIcon,
  ChevronRight as ChevronRightIcon,
  Security as SecurityIcon,
} from "@mui/icons-material";
import { Box, Button, CardContent, Chip, Grid, Stack, Typography } from "@mui/material";
import type { Route } from "next";
import Link from "next/link";
import { GlassCard } from "@/components/ui/cards";
import { StatusBadge } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/inputs";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { AnalysisListResponse } from "@/types/api/analysis";
import { getEcosystemLabel, getHealthColor } from "./analysis-utils";
import { CreateAnalysisDialog } from "./create-analysis-dialog";

interface AnalysisTabProps {
  projectId: string;
  canEdit: boolean;
}

export function AnalysisTab(props: AnalysisTabProps): ReactElement {
  const { projectId, canEdit } = props;
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data } = useApiQuery<AnalysisListResponse>(["analyses", projectId, 1], () =>
    client.api.projects({ id: projectId }).analyses.get({
      query: { page: 1, limit: 3 },
    }),
  );

  if (!data || data.items.length === 0) {
    return (
      <Box className="vault-fade-up vault-delay-2">
        <EmptyState
          icon={<SecurityIcon />}
          title="No analyses yet"
          description="Upload a dependency file or import from GitHub to analyze your project's dependencies."
          actionLabel={canEdit ? "New Analysis" : undefined}
          onAction={canEdit ? () => setCreateDialogOpen(true) : undefined}
        />
        <CreateAnalysisDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          projectId={projectId}
        />
      </Box>
    );
  }

  return (
    <Box className="vault-fade-up vault-delay-2">
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Recent Analyses
        </Typography>
        {canEdit && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            New Analysis
          </Button>
        )}
      </Stack>

      <Grid container spacing={2}>
        {data.items.map((analysis) => (
          <Grid size={{ xs: 12 }} key={analysis.id}>
            <Link
              href={ROUTES.projectAnalysisDetail(projectId, analysis.id) as Route}
              style={{ textDecoration: "none", display: "block" }}
            >
              <GlassCard sx={{ cursor: "pointer", "&:hover": { borderColor: "primary.main" } }}>
                <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {analysis.filePath ?? analysis.fileName}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={getEcosystemLabel(analysis.ecosystem)}
                          size="small"
                          variant="outlined"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(analysis.createdAt).toLocaleDateString()}
                        </Typography>
                      </Stack>
                    </Stack>
                    <StatusBadge
                      label={analysis.healthScore !== null ? `${analysis.healthScore}%` : "Pending"}
                      variant={getHealthColor(analysis.healthScore)}
                      glow
                    />
                  </Stack>
                </CardContent>
              </GlassCard>
            </Link>
          </Grid>
        ))}
      </Grid>

      <Stack alignItems="center" sx={{ mt: 3 }}>
        <LinkButton href={ROUTES.projectAnalysis(projectId)} endIcon={<ChevronRightIcon />}>
          View all analyses ({data.pagination.total})
        </LinkButton>
      </Stack>

      <CreateAnalysisDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        projectId={projectId}
      />
    </Box>
  );
}
