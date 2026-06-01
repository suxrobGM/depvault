"use client";

import { useState, type ReactElement } from "react";
import {
  RemoveCircleOutlined as FalsePositiveIcon,
  CheckCircle as ResolveIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Checkbox,
  MenuItem,
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
import { Surface } from "@/components/ui/cards";
import { PaginationBar } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/feedback";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  BatchUpdateDetectionsBody,
  BatchUpdateDetectionsDto,
  DetectionDto,
  DetectionListResponseDto,
} from "@/types/api/secret-scan";
import { DetectionTableRow } from "./detection-table-row";

interface DetectionsTableProps {
  projectId: string;
}

export function DetectionsTable(props: DetectionsTableProps): ReactElement {
  const { projectId } = props;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const query: Record<string, unknown> = { page, limit: pageSize };
  if (statusFilter) query.status = statusFilter;
  if (severityFilter) query.severity = severityFilter;

  const { data, isLoading } = useApiQuery<DetectionListResponseDto>(
    queryKeys.scanning.detectionsList(projectId, page, pageSize, statusFilter, severityFilter),
    () => client.api.projects({ id: projectId }).detections.get({ query: query as never }),
    { errorMessage: "Failed to load detections" },
  );

  const updateStatus = useApiMutation<DetectionDto, { detectionId: string; status: string }>(
    (vars) =>
      client.api
        .projects({ id: projectId })
        .detections({ detectionId: vars.detectionId })
        .patch({ status: vars.status as "RESOLVED" | "FALSE_POSITIVE" }),
    {
      invalidateKeys: [
        queryKeys.scanning.detections(projectId),
        queryKeys.scanning.summary(projectId),
      ],
      successMessage: "Detection updated",
    },
  );

  const batchUpdate = useApiMutation<BatchUpdateDetectionsDto, BatchUpdateDetectionsBody>(
    (vars) =>
      client.api.projects({ id: projectId }).detections.patch({
        detectionIds: vars.detectionIds,
        status: vars.status,
      }),
    {
      invalidateKeys: [
        queryKeys.scanning.detections(projectId),
        queryKeys.scanning.summary(projectId),
      ],
      successMessage: "Detections updated",
      onSuccess: () => setSelectedIds(new Set()),
    },
  );

  const detections = data?.items ?? [];
  const openDetections = detections.filter((d) => d.status === "OPEN");

  const allOpenSelected =
    openDetections.length > 0 && openDetections.every((d) => selectedIds.has(d.id));

  const someSelected = selectedIds.size > 0;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(openDetections.map((d) => d.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedIds(next);
  };

  const handleBatchAction = (status: "RESOLVED" | "FALSE_POSITIVE") => {
    batchUpdate.mutate({ detectionIds: [...selectedIds], status });
  };

  return (
    <Surface sx={{ p: 2 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 2 }}>
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="OPEN">Open</MenuItem>
          <MenuItem value="RESOLVED">Resolved</MenuItem>
          <MenuItem value="FALSE_POSITIVE">False Positive</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Severity"
          value={severityFilter}
          onChange={(e) => {
            setSeverityFilter(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="CRITICAL">Critical</MenuItem>
          <MenuItem value="HIGH">High</MenuItem>
          <MenuItem value="MEDIUM">Medium</MenuItem>
          <MenuItem value="LOW">Low</MenuItem>
        </TextField>

        {someSelected && (
          <>
            <Box sx={{ flex: 1 }} />
            <Typography variant="body2Muted">{selectedIds.size} selected</Typography>
            <Button
              size="small"
              variant="outlined"
              color="success"
              startIcon={<ResolveIcon />}
              onClick={() => handleBatchAction("RESOLVED")}
              disabled={batchUpdate.isPending}
            >
              Resolve
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<FalsePositiveIcon />}
              onClick={() => handleBatchAction("FALSE_POSITIVE")}
              disabled={batchUpdate.isPending}
            >
              False Positive
            </Button>
          </>
        )}
      </Stack>
      {detections.length === 0 && !isLoading ? (
        <EmptyState
          title="No detections found"
          description="No secret detections match your current filters."
        />
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={allOpenSelected}
                    indeterminate={someSelected && !allOpenSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell width={40} />
                <TableCell>Commit</TableCell>
                <TableCell>File</TableCell>
                <TableCell>Pattern</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detections.map((d) => (
                <DetectionTableRow
                  key={d.id}
                  detection={d}
                  expanded={expandedId === d.id}
                  onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
                  onResolve={() => updateStatus.mutate({ detectionId: d.id, status: "RESOLVED" })}
                  onFalsePositive={() =>
                    updateStatus.mutate({ detectionId: d.id, status: "FALSE_POSITIVE" })
                  }
                  isUpdating={updateStatus.isPending}
                  selected={selectedIds.has(d.id)}
                  onSelect={(checked) => handleSelect(d.id, checked)}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {data && (
        <PaginationBar
          page={page}
          count={data.pagination.totalPages}
          onChange={setPage}
          total={data.pagination.total}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      )}
    </Surface>
  );
}
