"use client";

import { useState, type ReactElement } from "react";
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  AccountTree as GraphIcon,
  Refresh as RescanIcon,
  TableChart as TableIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { AnalysisDetailResponse } from "@/types/api/analysis";
import type { MemberListResponse, ProjectResponse } from "@/types/api/project";
import { AnalysisSummaryStats } from "./analysis-summary-stats";
import { getEcosystemLabel, getHealthColor } from "./analysis-utils";
import { DependencyDataGrid } from "./dependency-data-grid";
import { DependencyGraph } from "./dependency-graph";

interface AnalysisDetailPageProps {
  projectId: string;
  analysisId: string;
}

type ViewMode = "table" | "graph";

export function AnalysisDetailPage(props: AnalysisDetailPageProps): ReactElement {
  const { projectId, analysisId } = props;
  const router = useRouter();
  const { user } = useAuth();
  const notification = useNotification();
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPath, setEditingPath] = useState(false);
  const [filePathDraft, setFilePathDraft] = useState("");

  const { data: project } = useApiQuery<ProjectResponse>(["projects", projectId], () =>
    client.api.projects({ id: projectId }).get(),
  );

  const { data: membersData } = useApiQuery<MemberListResponse>(
    ["projects", projectId, "members"],
    () => client.api.projects({ id: projectId }).members.get({ query: { page: 1, limit: 50 } }),
  );

  const { data: analysis, isLoading } = useApiQuery<AnalysisDetailResponse>(
    ["analyses", projectId, analysisId],
    () => client.api.analyses.project({ projectId })({ analysisId }).get(),
  );

  const deleteMutation = useApiMutation(
    () => client.api.analyses.project({ projectId })({ analysisId }).delete(),
    {
      invalidateKeys: [["analyses", projectId]],
      onSuccess: () => {
        notification.success("Analysis deleted");
        router.push(ROUTES.projectAnalysis(projectId) as Route);
      },
      onError: () => {
        notification.error("Failed to delete analysis");
      },
    },
  );

  const updateMutation = useApiMutation(
    (body: { filePath: string | null }) =>
      client.api.analyses.project({ projectId })({ analysisId }).patch(body),
    {
      invalidateKeys: [["analyses", projectId, analysisId]],
      onSuccess: () => {
        notification.success("File path updated");
        setEditingPath(false);
      },
      onError: () => {
        notification.error("Failed to update file path");
      },
    },
  );

  const rescanMutation = useApiMutation(
    () => client.api.analyses.project({ projectId })({ analysisId }).rescan.post(),
    {
      invalidateKeys: [
        ["analyses", projectId, analysisId],
        ["analyses", projectId],
      ],
      onSuccess: () => {
        notification.success("Rescan completed");
      },
      onError: () => {
        notification.error("Failed to rescan dependencies");
      },
    },
  );

  const currentMember = membersData?.items.find((m) => m.user.id === user?.id);
  const canEdit = currentMember?.role === "OWNER" || currentMember?.role === "EDITOR";

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={200} height={24} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={400} />
      </Box>
    );
  }

  if (!analysis) {
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <Typography color="text.secondary">Analysis not found</Typography>
        <Button
          onClick={() => router.push(ROUTES.projectAnalysis(projectId) as Route)}
          sx={{ mt: 2 }}
        >
          Back to analyses
        </Button>
      </Stack>
    );
  }

  const displayName = analysis.filePath ?? analysis.fileName;

  return (
    <Box>
      <PageHeader
        title={displayName}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard as Route },
          { label: "Projects", href: ROUTES.projects as Route },
          { label: project?.name ?? "Project", href: ROUTES.project(projectId) as Route },
          { label: "Analysis", href: ROUTES.projectAnalysis(projectId) as Route },
          { label: displayName },
        ]}
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            {canEdit && (
              <Tooltip title="Rescan dependencies">
                <IconButton
                  size="small"
                  onClick={() => rescanMutation.mutate()}
                  disabled={rescanMutation.isPending}
                >
                  {rescanMutation.isPending ? (
                    <CircularProgress size={18} />
                  ) : (
                    <RescanIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            )}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, v) => v && setViewMode(v)}
              size="small"
            >
              <ToggleButton value="table">
                <Tooltip title="Table view">
                  <TableIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="graph">
                <Tooltip title="Graph view">
                  <GraphIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
            {canEdit && (
              <Tooltip title="Delete analysis">
                <IconButton color="error" onClick={() => setDeleteDialogOpen(true)} size="small">
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        }
      />

      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
        <Chip label={getEcosystemLabel(analysis.ecosystem)} size="small" variant="outlined" />
        <StatusBadge
          label={analysis.healthScore !== null ? `${analysis.healthScore}%` : "Pending"}
          variant={getHealthColor(analysis.healthScore)}
          glow
        />
        <Typography variant="caption" color="text.secondary">
          {new Date(analysis.createdAt).toLocaleString()} &middot; {analysis.dependencies.length}{" "}
          dependencies
        </Typography>
      </Stack>

      {canEdit && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          {editingPath ? (
            <>
              <TextField
                size="small"
                placeholder="e.g., packages/api/package.json"
                value={filePathDraft}
                onChange={(e) => setFilePathDraft(e.target.value)}
                sx={{ width: 360 }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateMutation.mutate({ filePath: filePathDraft || null });
                  } else if (e.key === "Escape") {
                    setEditingPath(false);
                  }
                }}
              />
              <IconButton
                size="small"
                color="primary"
                onClick={() => updateMutation.mutate({ filePath: filePathDraft || null })}
                disabled={updateMutation.isPending}
              >
                <CheckIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setEditingPath(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </>
          ) : (
            <Tooltip title="Edit file path">
              <IconButton
                size="small"
                onClick={() => {
                  setFilePathDraft(analysis.filePath ?? "");
                  setEditingPath(true);
                }}
              >
                <EditIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      )}

      <AnalysisSummaryStats
        dependencies={analysis.dependencies}
        healthScore={analysis.healthScore}
      />

      {viewMode === "table" ? (
        <DependencyDataGrid dependencies={analysis.dependencies} ecosystem={analysis.ecosystem} />
      ) : (
        <DependencyGraph dependencies={analysis.dependencies} fileName={displayName} />
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Analysis"
        description="Are you sure you want to delete this analysis? This will remove all dependency data and cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Box>
  );
}
