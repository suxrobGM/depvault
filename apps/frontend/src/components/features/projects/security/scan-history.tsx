"use client";

import { useState, type ReactElement } from "react";
import {
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { GlassCard } from "@/components/ui/cards";
import { PaginationBar } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/feedback";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { ScanListResponse } from "@/types/api/secret-scan";

interface ScanHistoryProps {
  projectId: string;
}

const STATUS_COLORS: Record<string, "success" | "error" | "warning" | "info"> = {
  COMPLETED: "success",
  FAILED: "error",
  RUNNING: "warning",
  PENDING: "info",
};

export function ScanHistory(props: ScanHistoryProps): ReactElement {
  const { projectId } = props;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = useApiQuery<ScanListResponse>(
    ["scans", projectId, page, pageSize],
    () => client.api.projects({ id: projectId }).scans.get({ query: { page, limit: pageSize } }),
    { errorMessage: "Failed to load scan history" },
  );

  const scans = data?.items ?? [];

  return (
    <GlassCard>
      {scans.length === 0 && !isLoading ? (
        <EmptyState
          title="No scans yet"
          description="Run your first scan to detect secrets in your repository."
        />
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Commits Scanned</TableCell>
                <TableCell align="right">Detections</TableCell>
                <TableCell>Error</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scans.map((scan) => (
                <TableRow key={scan.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontSize={13}>
                      {new Date(scan.createdAt).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={scan.status}
                      size="small"
                      color={STATUS_COLORS[scan.status] ?? "default"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{scan.commitsScanned}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      fontWeight={scan.detectionsFound > 0 ? 600 : 400}
                      color={scan.detectionsFound > 0 ? "error.main" : "text.primary"}
                    >
                      {scan.detectionsFound}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {scan.errorMessage && (
                      <Typography
                        variant="body2"
                        color="error"
                        fontSize={12}
                        noWrap
                        sx={{ maxWidth: 200 }}
                      >
                        {scan.errorMessage}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
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
    </GlassCard>
  );
}
