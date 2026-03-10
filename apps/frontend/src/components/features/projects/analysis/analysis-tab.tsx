"use client";

import { useState, type ReactElement } from "react";
import { Add as AddIcon, Security as SecurityIcon } from "@mui/icons-material";
import { Box, Button, CardContent, Chip, Grid, Pagination, Stack, Typography } from "@mui/material";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { AnalysisListResponse } from "@/types/api/analysis";
import { AnalysisDetailView } from "./analysis-detail-view";
import { getEcosystemLabel, getHealthColor } from "./analysis-utils";
import { CreateAnalysisDialog } from "./create-analysis-dialog";

interface AnalysisTabProps {
  projectId: string;
  canEdit: boolean;
}

const ITEMS_PER_PAGE = 10;

export function AnalysisTab(props: AnalysisTabProps): ReactElement {
  const { projectId, canEdit } = props;
  const [page, setPage] = useState(1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);

  const { data } = useApiQuery<AnalysisListResponse>(["analyses", projectId, page], () =>
    client.api.analyses.project({ projectId }).get({
      query: { page, limit: ITEMS_PER_PAGE },
    }),
  );

  if (selectedAnalysisId) {
    return (
      <AnalysisDetailView
        projectId={projectId}
        analysisId={selectedAnalysisId}
        canEdit={canEdit}
        onBack={() => setSelectedAnalysisId(null)}
      />
    );
  }

  if (!data || (data.items.length === 0 && page === 1)) {
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
          {data.pagination.total} {data.pagination.total === 1 ? "Analysis" : "Analyses"}
        </Typography>
        {canEdit && (
          <Button
            variant="contained"
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
            <GlassCard
              sx={{ cursor: "pointer", "&:hover": { borderColor: "primary.main" } }}
              onClick={() => setSelectedAnalysisId(analysis.id)}
            >
              <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {analysis.fileName}
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
          </Grid>
        ))}
      </Grid>

      {data.pagination.totalPages > 1 && (
        <Stack alignItems="center" sx={{ mt: 3 }}>
          <Pagination
            count={data.pagination.totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
          />
        </Stack>
      )}

      <CreateAnalysisDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        projectId={projectId}
      />
    </Box>
  );
}
