"use client";

import { useState, type ReactElement } from "react";
import {
  Add as AddIcon,
  FolderOpen as FolderIcon,
  Security as SecurityIcon,
} from "@mui/icons-material";
import { Box, Button, Chip, Skeleton, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { Route } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard } from "@/components/ui/glass-card";
import { HealthArc } from "@/components/ui/health-arc";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { Analysis, AnalysisListResponse } from "@/types/api/analysis";
import type { MemberListResponse, ProjectResponse } from "@/types/api/project";
import { getEcosystemLabel } from "./analysis-utils";
import { CreateAnalysisDialog } from "./create-analysis-dialog";

interface AnalysisListViewProps {
  projectId: string;
}

interface AnalysisRowProps {
  item: Analysis;
  projectId: string;
  index: number;
}

const PAGE_SIZE = 10;

function AnalysisRow(props: AnalysisRowProps): ReactElement {
  const { item, projectId, index } = props;

  const displayName = item.filePath ?? item.fileName;

  const dirPath = displayName.includes("/")
    ? displayName.substring(0, displayName.lastIndexOf("/") + 1)
    : null;

  const fileName = displayName.includes("/")
    ? displayName.substring(displayName.lastIndexOf("/") + 1)
    : displayName;

  const delayClass = index < 8 ? `vault-delay-${index + 1}` : "vault-delay-8";

  return (
    <Link
      href={ROUTES.projectAnalysisDetail(projectId, item.id) as Route}
      style={{ textDecoration: "none", display: "block" }}
    >
      <GlassCard
        className={`vault-fade-up ${delayClass}`}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2.5,
          px: 2.5,
          py: 2,
          "&:hover": {
            borderColor: (t) => alpha(t.palette.primary.main, 0.25),
            boxShadow: (t) => `0 0 20px ${alpha(t.palette.primary.main, 0.08)}`,
            transform: "translateY(-1px)",
          },
        }}
      >
        <HealthArc score={item.healthScore ?? null} />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            fontWeight={600}
            noWrap
            sx={{ color: "text.primary", lineHeight: 1.4 }}
          >
            {dirPath && (
              <Typography
                component="span"
                variant="body2"
                sx={{ color: "text.disabled", fontWeight: 400 }}
              >
                {dirPath}
              </Typography>
            )}
            {fileName}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            <Chip
              label={getEcosystemLabel(item.ecosystem)}
              size="small"
              variant="outlined"
              sx={{ height: 22, fontSize: "0.7rem" }}
            />
            <Typography variant="caption" color="text.disabled">
              {new Date(item.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Typography>
          </Stack>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexShrink: 0 }}>
          {item.dependencyCount !== undefined && item.dependencyCount > 0 && (
            <Chip
              icon={<FolderIcon sx={{ fontSize: 14 }} />}
              label={`${item.dependencyCount} deps`}
              size="small"
              variant="outlined"
              sx={{ height: 24, fontSize: "0.7rem", borderColor: "divider" }}
            />
          )}
        </Stack>
      </GlassCard>
    </Link>
  );
}

export function AnalysisListView(props: AnalysisListViewProps): ReactElement {
  const { projectId } = props;
  const { user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data: project } = useApiQuery<ProjectResponse>(["projects", projectId], () =>
    client.api.projects({ id: projectId }).get(),
  );

  const { data: membersData } = useApiQuery<MemberListResponse>(
    ["projects", projectId, "members"],
    () => client.api.projects({ id: projectId }).members.get({ query: { page: 1, limit: 50 } }),
  );

  const { data, isLoading } = useApiQuery<AnalysisListResponse>(
    ["analyses", projectId, page, PAGE_SIZE],
    () =>
      client.api.projects({ id: projectId }).analyses.get({
        query: { page, limit: PAGE_SIZE },
      }),
  );

  const currentMember = membersData?.items.find((m) => m.user.id === user?.id);
  const canEdit = currentMember?.role === "OWNER" || currentMember?.role === "EDITOR";

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 1 }} />
        <ListSkeleton height={68} />
      </Box>
    );
  }

  const hasAnalyses = data && data.items.length > 0;
  const totalPages = data ? Math.ceil(data.pagination.total / PAGE_SIZE) : 0;

  return (
    <Box>
      <PageHeader
        title="Analysis"
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard as Route },
          { label: "Projects", href: ROUTES.projects as Route },
          { label: project?.name ?? "Project", href: ROUTES.project(projectId) as Route },
          { label: "Analysis" },
        ]}
        actions={
          canEdit ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              New Analysis
            </Button>
          ) : undefined
        }
      />

      {!hasAnalyses ? (
        <EmptyState
          icon={<SecurityIcon />}
          title="No analyses yet"
          description="Upload a dependency file or import from GitHub to analyze your project's dependencies."
          actionLabel={canEdit ? "New Analysis" : undefined}
          onAction={canEdit ? () => setCreateDialogOpen(true) : undefined}
        />
      ) : (
        <Stack spacing={1.5}>
          {data.items.map((item, index) => (
            <AnalysisRow key={item.id} item={item} projectId={projectId} index={index} />
          ))}

          {totalPages > 1 && <PaginationBar count={totalPages} page={page} onChange={setPage} />}
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
