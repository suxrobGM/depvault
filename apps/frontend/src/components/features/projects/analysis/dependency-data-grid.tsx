"use client";

import { useState, type ReactElement } from "react";
import { Box, Chip, Collapse, Stack, Typography } from "@mui/material";
import { DataGrid, QuickFilter, QuickFilterControl, type GridColDef } from "@mui/x-data-grid";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Dependency, Vulnerability } from "@/types/api/analysis";

interface DependencyDataGridProps {
  dependencies: Dependency[];
}

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

const columns: GridColDef[] = [
  {
    field: "name",
    headerName: "Package",
    flex: 1.5,
    minWidth: 180,
    renderCell: (params) => (
      <Typography variant="body2" fontWeight={600} noWrap>
        {params.value}
      </Typography>
    ),
  },
  {
    field: "currentVersion",
    headerName: "Installed",
    width: 120,
    renderCell: (params) => (
      <Typography variant="body2" fontFamily="monospace" fontSize={13}>
        {params.value}
      </Typography>
    ),
  },
  {
    field: "latestVersion",
    headerName: "Latest",
    width: 120,
    renderCell: (params) => (
      <Typography
        variant="body2"
        fontFamily="monospace"
        fontSize={13}
        color={
          params.value && params.value !== params.row.currentVersion
            ? "primary.main"
            : "text.secondary"
        }
      >
        {params.value ?? "—"}
      </Typography>
    ),
  },
  {
    field: "status",
    headerName: "Status",
    width: 140,
    renderCell: (params) => (
      <StatusBadge
        label={STATUS_LABEL[params.value] ?? params.value}
        variant={STATUS_VARIANT[params.value] ?? "default"}
      />
    ),
  },
  {
    field: "vulnCount",
    headerName: "Vulns",
    width: 80,
    type: "number",
    valueGetter: (_value: unknown, row: Dependency) => row.vulnerabilities.length,
    renderCell: (params) =>
      params.value > 0 ? (
        <Chip label={params.value} size="small" color="error" />
      ) : (
        <Typography variant="caption" color="text.secondary">
          0
        </Typography>
      ),
  },
];

function CustomToolbar(): ReactElement {
  return (
    <Box sx={{ p: 1.5, pb: 0 }}>
      <QuickFilter style={{ width: "100%", maxWidth: 320 }}>
        <QuickFilterControl placeholder="Search dependencies..." />
      </QuickFilter>
    </Box>
  );
}

function VulnerabilityPanel(props: { vulnerabilities: Vulnerability[] }): ReactElement {
  const { vulnerabilities } = props;

  return (
    <Stack
      spacing={1}
      sx={{ pl: 2, pr: 2, pb: 2, borderLeft: 2, borderColor: "error.main", ml: 2 }}
    >
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
            <Typography variant="caption" display="block">
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

export function DependencyDataGrid(props: DependencyDataGridProps): ReactElement {
  const { dependencies } = props;
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const rows = dependencies.map((dep) => ({ ...dep, id: dep.id }));
  const expandedDep = expandedRowId
    ? (dependencies.find((d) => d.id === expandedRowId) ?? null)
    : null;

  return (
    <Box>
      <DataGrid
        rows={rows}
        columns={columns}
        pageSizeOptions={[10, 25, 50]}
        initialState={{
          pagination: { paginationModel: { pageSize: 25 } },
          sorting: {
            sortModel: [{ field: "vulnCount", sort: "desc" }],
          },
        }}
        slots={{ toolbar: CustomToolbar }}
        onRowClick={(params) => {
          const dep = params.row as Dependency;
          if (dep.vulnerabilities.length > 0) {
            setExpandedRowId(expandedRowId === dep.id ? null : dep.id);
          }
        }}
        getRowClassName={(params) =>
          (params.row as Dependency).vulnerabilities.length > 0 ? "clickable-row" : ""
        }
        disableRowSelectionOnClick
        sx={{
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "rgba(255,255,255,0.02)",
          "& .MuiDataGrid-cell": { borderColor: "divider" },
          "& .MuiDataGrid-columnHeaders": { borderColor: "divider" },
          "& .clickable-row": { cursor: "pointer" },
        }}
      />
      <Collapse in={!!expandedDep} sx={{ mt: 1 }}>
        {expandedDep && expandedDep.vulnerabilities.length > 0 && (
          <Box
            sx={{
              p: 2,
              bgcolor: "rgba(255,255,255,0.02)",
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Vulnerabilities for {expandedDep.name}
            </Typography>
            <VulnerabilityPanel vulnerabilities={expandedDep.vulnerabilities} />
          </Box>
        )}
      </Collapse>
    </Box>
  );
}
