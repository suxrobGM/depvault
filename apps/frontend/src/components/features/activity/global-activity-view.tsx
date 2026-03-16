"use client";

import { useState, type ReactElement } from "react";
import { History as HistoryIcon } from "@mui/icons-material";
import { Box } from "@mui/material";
import { ActivityLogEntry } from "@/components/features/projects/activity/activity-log-entry";
import { ListSkeleton, PaginationBar } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/feedback";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { GlobalActivityListResponse } from "@/types/api/activity";
import { ActivityUpgradeGate } from "./activity-upgrade-gate";
import {
  EMPTY_FILTERS,
  GlobalActivityFilterBar,
  type GlobalActivityFilters,
} from "./global-activity-filter-bar";

const PAGE_SIZE = 20;

export function GlobalActivityView(): ReactElement {
  const [filters, setFilters] = useState<GlobalActivityFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useApiQuery<GlobalActivityListResponse>(
    [
      "global-activity",
      page,
      PAGE_SIZE,
      filters.action,
      filters.resourceType,
      filters.from,
      filters.to,
    ],
    () =>
      client.api.activity.get({
        query: {
          page,
          limit: PAGE_SIZE,
          ...(filters.action && { action: filters.action }),
          ...(filters.resourceType && { resourceType: filters.resourceType }),
          ...(filters.from && { from: new Date(filters.from).toISOString() }),
          ...(filters.to && { to: new Date(`${filters.to}T23:59:59.999`).toISOString() }),
        },
      }),
    { errorMessage: "Failed to load activity" },
  );

  const handleFiltersChange = (newFilters: GlobalActivityFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");
  const totalPages = data ? Math.ceil(data.pagination.total / PAGE_SIZE) : 0;

  return (
    <ActivityUpgradeGate>
      <Box>
        <GlobalActivityFilterBar filters={filters} onFiltersChange={handleFiltersChange} />

        {isLoading ? (
          <ListSkeleton />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={<HistoryIcon />}
            title="No activity found"
            description={
              hasActiveFilters
                ? "Try adjusting your filters to find what you're looking for."
                : "Activity will appear here as you and your team interact with projects."
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
                projectName={entry.projectName}
              />
            ))}

            {totalPages > 1 && <PaginationBar count={totalPages} page={page} onChange={setPage} />}
          </Box>
        )}
      </Box>
    </ActivityUpgradeGate>
  );
}
