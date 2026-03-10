"use client";

import { useState, type ReactElement } from "react";
import { Search as SearchIcon } from "@mui/icons-material";
import { Box, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SortableHeader } from "@/components/ui/sortable-header";
import type { Dependency } from "@/types/api/analysis";
import { STATUS_ORDER } from "./analysis-utils";
import { DependencyRow } from "./dependency-row";

interface DependencyDataGridProps {
  dependencies: Dependency[];
  ecosystem?: string;
}

type SortField = "name" | "status" | "vulns";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 25;
const GRID_COLUMNS = "1.5fr 110px 110px 140px 70px 40px";

const columnLabelSx = {
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  fontSize: "0.65rem",
  color: "text.secondary",
} as const;

export function DependencyDataGrid(props: DependencyDataGridProps): ReactElement {
  const { dependencies, ecosystem } = props;
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

  const handleSort = (field: string) => {
    const f = field as SortField;
    if (sortField === f) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(f);
      setSortDir(f === "name" ? "asc" : "desc");
    }
    setPage(1);
    setExpandedRowId(null);
  };

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
          activeField={sortField}
          direction={sortDir}
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
          activeField={sortField}
          direction={sortDir}
          onSort={handleSort}
        />
        <SortableHeader
          field="vulns"
          label="Vulns"
          activeField={sortField}
          direction={sortDir}
          onSort={handleSort}
        />
        <Box />
      </Box>

      <Stack spacing={0.75}>
        {paginated.map((dep) => (
          <DependencyRow
            key={dep.id}
            dep={dep}
            ecosystem={ecosystem}
            gridColumns={GRID_COLUMNS}
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
