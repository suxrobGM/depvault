"use client";

import { useState, type ReactElement } from "react";
import { Add as AddIcon, Security as SecurityIcon } from "@mui/icons-material";
import { Box, Button, Chip, Skeleton, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { AnalysisListResponse } from "@/types/api/analysis";
import type { MemberListResponse, ProjectResponse } from "@/types/api/project";
import { getEcosystemLabel, getHealthColor } from "./analysis-utils";
import { CreateAnalysisDialog } from "./create-analysis-dialog";

interface AnalysisListViewProps {
  projectId: string;
}

const columns: GridColDef[] = [
  {
    field: "filePath",
    headerName: "File",
    flex: 1.5,
    minWidth: 200,
    valueGetter: (_value: unknown, row: { filePath?: string | null; fileName: string }) =>
      row.filePath ?? row.fileName,
    renderCell: (params) => (
      <Typography variant="body2" fontWeight={600} noWrap>
        {params.value}
      </Typography>
    ),
  },
  {
    field: "ecosystem",
    headerName: "Ecosystem",
    width: 120,
    renderCell: (params) => (
      <Chip label={getEcosystemLabel(params.value)} size="small" variant="outlined" />
    ),
  },
  {
    field: "healthScore",
    headerName: "Health",
    width: 120,
    renderCell: (params) => (
      <StatusBadge
        label={params.value !== null ? `${params.value}%` : "Pending"}
        variant={getHealthColor(params.value)}
        glow
      />
    ),
  },
  {
    field: "dependencyCount",
    headerName: "Deps",
    width: 80,
    type: "number",
  },
  {
    field: "createdAt",
    headerName: "Date",
    width: 140,
    valueFormatter: (value: string) => new Date(value).toLocaleDateString(),
  },
];

export function AnalysisListView(props: AnalysisListViewProps): ReactElement {
  const { projectId } = props;
  const router = useRouter();
  const { user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

  const { data: project } = useApiQuery<ProjectResponse>(["projects", projectId], () =>
    client.api.projects({ id: projectId }).get(),
  );

  const { data: membersData } = useApiQuery<MemberListResponse>(
    ["projects", projectId, "members"],
    () => client.api.projects({ id: projectId }).members.get({ query: { page: 1, limit: 50 } }),
  );

  const { data, isLoading } = useApiQuery<AnalysisListResponse>(
    ["analyses", projectId, paginationModel.page + 1, paginationModel.pageSize],
    () =>
      client.api.analyses.project({ projectId }).get({
        query: { page: paginationModel.page + 1, limit: paginationModel.pageSize },
      }),
  );

  const currentMember = membersData?.items.find((m) => m.user.id === user?.id);
  const canEdit = currentMember?.role === "OWNER" || currentMember?.role === "EDITOR";

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={400} />
      </Box>
    );
  }

  const hasAnalyses = data && data.items.length > 0;

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
        <DataGrid
          rows={data.items}
          columns={columns}
          paginationMode="server"
          rowCount={data.pagination.total}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25]}
          onRowClick={(params) => {
            router.push(ROUTES.projectAnalysisDetail(projectId, params.row.id) as Route);
          }}
          disableRowSelectionOnClick
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            bgcolor: "rgba(255,255,255,0.02)",
            "& .MuiDataGrid-row": { cursor: "pointer" },
            "& .MuiDataGrid-cell": { borderColor: "divider" },
            "& .MuiDataGrid-columnHeaders": { borderColor: "divider" },
          }}
        />
      )}

      <CreateAnalysisDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        projectId={projectId}
      />
    </Box>
  );
}
