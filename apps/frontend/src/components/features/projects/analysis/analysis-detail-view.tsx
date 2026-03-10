"use client";

import { useState, type ReactElement } from "react";
import {
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  AccountTree as GraphIcon,
  TableChart as TableIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  CardContent,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useNotification } from "@/hooks/use-notification";
import { client } from "@/lib/api";
import type { AnalysisDetailResponse, Dependency, Vulnerability } from "@/types/api/analysis";
import { getHealthColor } from "./analysis-utils";
import { DependencyGraph } from "./dependency-graph";

interface AnalysisDetailViewProps {
  projectId: string;
  analysisId: string;
  canEdit: boolean;
  onBack: () => void;
}

type ViewMode = "table" | "graph";

const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "default"> = {
  UP_TO_DATE: "success",
  MINOR_UPDATE: "warning",
  MAJOR_UPDATE: "error",
  DEPRECATED: "error",
};

const STATUS_LABEL: Record<string, string> = {
  UP_TO_DATE: "Up to date",
  MINOR_UPDATE: "Minor update",
  MAJOR_UPDATE: "Major update",
  DEPRECATED: "Deprecated",
};

const SEVERITY_VARIANT: Record<string, "error" | "warning" | "info" | "default"> = {
  CRITICAL: "error",
  HIGH: "error",
  MEDIUM: "warning",
  LOW: "info",
  NONE: "default",
};

export function AnalysisDetailView(props: AnalysisDetailViewProps): ReactElement {
  const { projectId, analysisId, canEdit, onBack } = props;
  const notification = useNotification();
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expandedDep, setExpandedDep] = useState<string | null>(null);

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
        onBack();
      },
      onError: () => {
        notification.error("Failed to delete analysis");
      },
    },
  );

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={400} />
      </Box>
    );
  }

  if (!analysis) {
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <Typography color="text.secondary">Analysis not found</Typography>
        <Button onClick={onBack} sx={{ mt: 2 }}>
          Back to list
        </Button>
      </Stack>
    );
  }

  return (
    <Box className="vault-fade-up vault-delay-2">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton onClick={onBack} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography variant="h6" fontWeight={600}>
                {analysis.fileName}
              </Typography>
              <Chip label={analysis.ecosystem} size="small" variant="outlined" />
              <StatusBadge
                label={analysis.healthScore !== null ? `${analysis.healthScore}%` : "Pending"}
                variant={getHealthColor(analysis.healthScore)}
                glow
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {new Date(analysis.createdAt).toLocaleString()} &middot;{" "}
              {analysis.dependencies.length} dependencies
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
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
            <IconButton color="error" onClick={() => setDeleteDialogOpen(true)} size="small">
              <DeleteIcon />
            </IconButton>
          )}
        </Stack>
      </Stack>

      {viewMode === "table" ? (
        <DependencyTable
          dependencies={analysis.dependencies}
          expandedDep={expandedDep}
          onToggleDep={setExpandedDep}
        />
      ) : (
        <DependencyGraph dependencies={analysis.dependencies} fileName={analysis.fileName} />
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

function DependencyTable(props: {
  dependencies: Dependency[];
  expandedDep: string | null;
  onToggleDep: (id: string | null) => void;
}): ReactElement {
  const { dependencies, expandedDep, onToggleDep } = props;

  const sorted = [...dependencies].sort((a, b) => {
    const vulnDiff = b.vulnerabilities.length - a.vulnerabilities.length;
    if (vulnDiff !== 0) return vulnDiff;
    return a.name.localeCompare(b.name);
  });

  return (
    <Stack spacing={1}>
      {sorted.map((dep) => (
        <GlassCard
          key={dep.id}
          sx={{ cursor: "pointer", "&:hover": { borderColor: "primary.main" } }}
          onClick={() => onToggleDep(expandedDep === dep.id ? null : dep.id)}
        >
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ minWidth: 180 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {dep.name}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>
                  {dep.currentVersion}
                </Typography>
                {dep.latestVersion && dep.latestVersion !== dep.currentVersion && (
                  <Typography variant="caption" color="primary.main" sx={{ minWidth: 80 }}>
                    &rarr; {dep.latestVersion}
                  </Typography>
                )}
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <StatusBadge
                  label={STATUS_LABEL[dep.status] ?? dep.status}
                  variant={STATUS_VARIANT[dep.status] ?? "default"}
                />
                {dep.vulnerabilities.length > 0 && (
                  <Chip
                    label={`${dep.vulnerabilities.length} vuln${dep.vulnerabilities.length > 1 ? "s" : ""}`}
                    size="small"
                    color="error"
                  />
                )}
              </Stack>
            </Stack>

            {expandedDep === dep.id && dep.vulnerabilities.length > 0 && (
              <VulnerabilityList vulnerabilities={dep.vulnerabilities} />
            )}
          </CardContent>
        </GlassCard>
      ))}
    </Stack>
  );
}

function VulnerabilityList(props: { vulnerabilities: Vulnerability[] }): ReactElement {
  const { vulnerabilities } = props;

  return (
    <Stack spacing={1} sx={{ mt: 2, pl: 2, borderLeft: 2, borderColor: "error.main" }}>
      {vulnerabilities.map((vuln) => (
        <Box key={vuln.id}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <StatusBadge
              label={vuln.severity}
              variant={SEVERITY_VARIANT[vuln.severity] ?? "default"}
            />
            {vuln.cveId && (
              <Typography variant="caption" fontWeight={600}>
                {vuln.cveId}
              </Typography>
            )}
          </Stack>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {vuln.title}
          </Typography>
          {vuln.fixedIn && (
            <Typography variant="caption" color="text.secondary">
              Fixed in: {vuln.fixedIn}
            </Typography>
          )}
          {vuln.url && (
            <Typography variant="caption">
              <a href={vuln.url} target="_blank" rel="noopener noreferrer">
                More info
              </a>
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
}
