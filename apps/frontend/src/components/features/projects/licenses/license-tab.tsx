"use client";

import { useState, type ReactElement } from "react";
import {
  Add as AddIcon,
  Download as DownloadIcon,
  Gavel as LicenseIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { Route } from "next";
import { CreateAnalysisDialog } from "@/components/features/projects/analysis";
import { PageHeader } from "@/components/ui/containers";
import { PaginationBar } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/feedback";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { client } from "@/lib/api";
import { API_BASE_URL, ROUTES } from "@/lib/constants";
import type { LicenseComplianceSummary } from "@/types/api/license-rule";
import type { MemberListResponse, ProjectResponse } from "@/types/api/project";
import { ComplianceSummaryStats } from "./compliance-summary-stats";
import { LicenseRulesTable } from "./license-rules-table";

interface LicenseTabProps {
  projectId: string;
}

const PAGE_SIZE = 25;

const POLICY_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  ALLOW: "success",
  WARN: "warning",
  BLOCK: "error",
};

/** Main license compliance tab combining summary, dependency list, rules, and export. */
export function LicenseTab(props: LicenseTabProps): ReactElement {
  const { projectId } = props;
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data: project } = useApiQuery<ProjectResponse>(["projects", projectId], () =>
    client.api.projects({ id: projectId }).get(),
  );

  const { data: membersData } = useApiQuery<MemberListResponse>(
    ["projects", projectId, "members"],
    () => client.api.projects({ id: projectId }).members.get({ query: { page: 1, limit: 50 } }),
  );

  const { data: compliance, isLoading } = useApiQuery<LicenseComplianceSummary>(
    ["license-compliance", projectId, page, PAGE_SIZE, search],
    () =>
      client.api.projects({ id: projectId })["license-rules"].compliance.get({
        query: { page, limit: PAGE_SIZE, ...(search && { search }) },
      }),
  );

  const currentMember = membersData?.items.find((m) => m.user.id === user?.id);
  const canEdit = currentMember?.role === "OWNER" || currentMember?.role === "EDITOR";

  const handleExport = (format: "csv" | "pdf") => {
    window.open(
      `${API_BASE_URL}/api/projects/${projectId}/license-rules/export?format=${format}`,
      "_blank",
    );
  };

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="License Compliance"
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard as Route },
          { label: "Projects", href: ROUTES.projects as Route },
          { label: project?.name ?? "Project", href: ROUTES.project(projectId) as Route },
          { label: "Licenses" },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
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
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={() => handleExport("csv")}
            >
              CSV
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={() => handleExport("pdf")}
            >
              PDF
            </Button>
          </Stack>
        }
      />

      {compliance && (
        <ComplianceSummaryStats
          total={compliance.total}
          allowed={compliance.allowed}
          warned={compliance.warned}
          blocked={compliance.blocked}
        />
      )}

      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Dependency Licenses
          </Typography>
          <TextField
            size="small"
            placeholder="Search dependencies..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            slotProps={{
              input: {
                startAdornment: <SearchIcon sx={{ mr: 1, fontSize: 18, color: "text.disabled" }} />,
              },
            }}
            sx={{ width: 260 }}
          />
        </Stack>

        {!compliance?.dependencies.length ? (
          <EmptyState
            icon={<LicenseIcon />}
            title="No dependencies found"
            description="Run an analysis to see license compliance data for your project's dependencies."
          />
        ) : (
          <TableContainer
            sx={{
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
              bgcolor: (t) => alpha(t.palette.background.paper, 0.3),
              backdropFilter: "blur(8px)",
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Package</TableCell>
                  <TableCell>Analysis</TableCell>
                  <TableCell>License</TableCell>
                  <TableCell sx={{ width: 120 }}>Policy</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {compliance?.dependencies.map((dep) => (
                  <TableRow key={dep.name}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {dep.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {dep.analysisFileName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{dep.license ?? "Unknown"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={dep.licensePolicy}
                        size="small"
                        color={POLICY_COLOR[dep.licensePolicy] ?? "default"}
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {compliance && compliance.pagination.totalPages > 1 && (
          <PaginationBar count={compliance.pagination.totalPages} page={page} onChange={setPage} />
        )}
      </Box>

      <LicenseRulesTable projectId={projectId} canEdit={canEdit} />

      <CreateAnalysisDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        projectId={projectId}
      />
    </Box>
  );
}
