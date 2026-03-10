"use client";

import { useState, type ReactElement } from "react";
import {
  KeyboardArrowUp as CollapseIcon,
  KeyboardArrowDown as ExpandIcon,
  Search as SearchIcon,
  UnfoldMore as SortIcon,
} from "@mui/icons-material";
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Dependency } from "@/types/api/analysis";
import { VulnerabilityPanel } from "./vulnerability-panel";

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

type SortField = "name" | "status" | "vulns";
type SortDir = "asc" | "desc";

const STATUS_ORDER: Record<string, number> = {
  DEPRECATED: 0,
  MAJOR_UPDATE: 1,
  MINOR_UPDATE: 2,
  UP_TO_DATE: 3,
};

const PAGE_SIZE = 25;
const GRID_COLUMNS = "1.5fr 110px 110px 140px 70px 40px";

const columnLabelSx = {
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  fontSize: "0.65rem",
  color: "text.secondary",
} as const;

function DependencyRow(props: {
  dep: Dependency;
  expanded: boolean;
  onToggle: () => void;
}): ReactElement {
  const { dep, expanded, onToggle } = props;
  const hasVulns = dep.vulnerabilities.length > 0;
  const versionDiffers = dep.latestVersion && dep.latestVersion !== dep.currentVersion;

  return (
    <Box>
      <Box
        role={hasVulns ? "button" : undefined}
        tabIndex={hasVulns ? 0 : undefined}
        onClick={hasVulns ? onToggle : undefined}
        onKeyDown={
          hasVulns
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle();
                }
              }
            : undefined
        }
        sx={{
          display: "grid",
          gridTemplateColumns: GRID_COLUMNS,
          alignItems: "center",
          gap: 1,
          px: 2.5,
          py: 1.5,
          borderRadius: 1.5,
          bgcolor: expanded
            ? (t) => alpha(t.palette.error.main, 0.04)
            : (t) => alpha(t.palette.background.paper, 0.25),
          border: 1,
          borderColor: expanded ? (t) => alpha(t.palette.error.main, 0.2) : "divider",
          transition: "all 0.15s ease",
          cursor: hasVulns ? "pointer" : "default",
          "&:hover": hasVulns
            ? {
                bgcolor: (t) => alpha(t.palette.error.main, 0.06),
                borderColor: (t) => alpha(t.palette.error.main, 0.25),
              }
            : {
                bgcolor: (t) => alpha(t.palette.background.paper, 0.4),
              },
        }}
      >
        <Typography variant="body2" fontWeight={600} noWrap>
          {dep.name}
        </Typography>

        <Typography variant="mono" color="text.secondary">
          {dep.currentVersion}
        </Typography>

        <Typography variant="mono" color={versionDiffers ? "primary.main" : "text.disabled"}>
          {dep.latestVersion ?? "\u2014"}
        </Typography>

        <Box>
          <StatusBadge
            label={STATUS_LABEL[dep.status] ?? dep.status}
            variant={STATUS_VARIANT[dep.status] ?? "default"}
          />
        </Box>

        <Box>
          {hasVulns ? (
            <Chip
              label={dep.vulnerabilities.length}
              size="small"
              color="error"
              sx={{ minWidth: 32, fontWeight: 700 }}
            />
          ) : (
            <Typography variant="caption" color="text.disabled">
              0
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center" }}>
          {hasVulns && (
            <IconButton size="small" sx={{ p: 0.25 }}>
              {expanded ? (
                <CollapseIcon sx={{ fontSize: 18 }} />
              ) : (
                <ExpandIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          )}
        </Box>
      </Box>

      <Collapse in={expanded}>
        {hasVulns && (
          <Box
            sx={{
              ml: 2.5,
              mr: 2.5,
              mt: -0.5,
              mb: 0.5,
              p: 2,
              bgcolor: (t) => alpha(t.palette.error.main, 0.03),
              borderRadius: "0 0 8px 8px",
              borderLeft: 1,
              borderRight: 1,
              borderBottom: 1,
              borderColor: (t) => alpha(t.palette.error.main, 0.15),
            }}
          >
            <Typography
              variant="caption"
              fontWeight={700}
              color="error.main"
              sx={{ mb: 1, display: "block" }}
            >
              {dep.vulnerabilities.length} VULNERABILIT
              {dep.vulnerabilities.length === 1 ? "Y" : "IES"}
            </Typography>
            <VulnerabilityPanel vulnerabilities={dep.vulnerabilities} />
          </Box>
        )}
      </Collapse>
    </Box>
  );
}

function SortableHeader(props: {
  field: SortField;
  label: string;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}): ReactElement {
  const { field, label, sortField, sortDir, onSort } = props;
  const active = sortField === field;

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onSort(field)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSort(field);
        }
      }}
      sx={{
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 0.25,
        userSelect: "none",
        "&:hover": { color: "text.primary" },
      }}
    >
      <Typography
        variant="caption"
        fontWeight={active ? 700 : 500}
        sx={{ ...columnLabelSx, color: active ? "text.primary" : "text.secondary" }}
      >
        {label}
      </Typography>
      <SortIcon
        sx={{
          fontSize: 14,
          opacity: active ? 1 : 0.3,
          transform: active && sortDir === "asc" ? "scaleY(-1)" : "none",
          transition: "all 0.15s",
        }}
      />
    </Box>
  );
}

export function DependencyDataGrid(props: DependencyDataGridProps): ReactElement {
  const { dependencies } = props;
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("vulns");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const filtered = dependencies.filter((dep) =>
    dep.name.toLowerCase().includes(search.toLowerCase()),
  );

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortField) {
      case "name":
        return dir * a.name.localeCompare(b.name);
      case "status":
        return dir * ((STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));
      case "vulns":
        return dir * (a.vulnerabilities.length - b.vulnerabilities.length);
      default:
        return 0;
    }
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
    setPage(1);
    setExpandedRowId(null);
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search packages..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
            setExpandedRowId(null);
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: "text.disabled" }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            width: 280,
            "& .MuiOutlinedInput-root": {
              bgcolor: (t) => alpha(t.palette.background.paper, 0.4),
              backdropFilter: "blur(8px)",
            },
          }}
        />
        <Typography variant="caption" color="text.disabled">
          {filtered.length} package{filtered.length !== 1 ? "s" : ""}
        </Typography>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: GRID_COLUMNS,
          gap: 1,
          px: 2.5,
          py: 1,
          mb: 1,
        }}
      >
        <SortableHeader
          field="name"
          label="Package"
          sortField={sortField}
          sortDir={sortDir}
          onSort={handleSort}
        />
        <Typography variant="caption" sx={columnLabelSx}>
          Installed
        </Typography>
        <Typography variant="caption" sx={columnLabelSx}>
          Latest
        </Typography>
        <SortableHeader
          field="status"
          label="Status"
          sortField={sortField}
          sortDir={sortDir}
          onSort={handleSort}
        />
        <SortableHeader
          field="vulns"
          label="Vulns"
          sortField={sortField}
          sortDir={sortDir}
          onSort={handleSort}
        />
        <Box />
      </Box>

      <Stack spacing={0.75}>
        {paginated.map((dep) => (
          <DependencyRow
            key={dep.id}
            dep={dep}
            expanded={expandedRowId === dep.id}
            onToggle={() => setExpandedRowId(expandedRowId === dep.id ? null : dep.id)}
          />
        ))}
      </Stack>

      {paginated.length === 0 && (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography variant="body2" color="text.disabled">
            No packages match &ldquo;{search}&rdquo;
          </Typography>
        </Box>
      )}

      {totalPages > 1 && <PaginationBar count={totalPages} page={page} onChange={setPage} />}
    </Box>
  );
}
