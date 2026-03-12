"use client";

import { useState, type ReactElement } from "react";
import { History as HistoryIcon } from "@mui/icons-material";
import { Box } from "@mui/material";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { AuditLogListResponse } from "@/types/api/audit-log";
import { ActivityFilterBar, EMPTY_FILTERS, type AuditLogFilters } from "./activity-filter-bar";
import { ActivityLogEntry } from "./activity-log-entry";

interface ActivityLogViewProps {
  projectId: string;
}

const PAGE_SIZE = 20;

export function ActivityLogView(props: ActivityLogViewProps): ReactElement {
  const { projectId } = props;
  const [filters, setFilters] = useState<AuditLogFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useApiQuery<AuditLogListResponse>(
    [
      "audit-log",
      projectId,
      page,
      PAGE_SIZE,
      filters.action,
      filters.resourceType,
      filters.from,
      filters.to,
      filters.userEmail,
    ],
    () =>
      client.api.projects({ id: projectId })["audit-log"].get({
        query: {
          page,
          limit: PAGE_SIZE,
          ...(filters.action && { action: filters.action }),
          ...(filters.resourceType && { resourceType: filters.resourceType }),
          ...(filters.from && { from: new Date(filters.from).toISOString() }),
          ...(filters.to && { to: new Date(`${filters.to}T23:59:59.999`).toISOString() }),
          ...(filters.userEmail && { userEmail: filters.userEmail }),
        },
      }),
    { errorMessage: "Failed to load activity log" },
  );

  const handleFiltersChange = (newFilters: AuditLogFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");
  const totalPages = data ? Math.ceil(data.pagination.total / PAGE_SIZE) : 0;

  return (
    <Box>
      <ActivityFilterBar filters={filters} onFiltersChange={handleFiltersChange} />

      {isLoading ? (
        <ListSkeleton />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon />}
          title="No activity found"
          description={
            hasActiveFilters
              ? "Try adjusting your filters to find what you're looking for."
              : "Activity will appear here as team members interact with the project vault."
          }
        />
      ) : (
        <Box sx={{ pl: { xs: 0, sm: 1 } }}>
          {data.items.map((entry, index) => (
            <ActivityLogEntry
              key={entry.id}
              entry={entry}
              index={index}
              isLast={index === data.items.length - 1}
            />
          ))}

          {totalPages > 1 && <PaginationBar count={totalPages} page={page} onChange={setPage} />}
        </Box>
      )}
    </Box>
  );
}
