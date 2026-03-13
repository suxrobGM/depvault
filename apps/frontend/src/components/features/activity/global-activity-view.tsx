"use client";

import { useState, type ReactElement } from "react";
import { History as HistoryIcon } from "@mui/icons-material";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  ACTIVITY_ACTION_CONFIG,
  generateActivityDescription,
  getActivityColor,
  RESOURCE_LABELS,
} from "@/components/features/projects/activity/utils";
import { ListSkeleton, PaginationBar, UserAvatar } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/feedback";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { GlobalActivityEntry, GlobalActivityListResponse } from "@/types/api/activity";
import { formatRelativeTime } from "@/utils/formatters";
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
            <GlobalActivityEntry
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

interface GlobalActivityEntryProps {
  entry: GlobalActivityEntry;
  index: number;
  isLast: boolean;
}

function GlobalActivityEntry(props: GlobalActivityEntryProps): ReactElement {
  const { entry, index, isLast } = props;

  const config = ACTIVITY_ACTION_CONFIG[entry.action] ?? ACTIVITY_ACTION_CONFIG.READ!;
  const resourceLabel = RESOURCE_LABELS[entry.resourceType] ?? entry.resourceType;
  const paletteKey = getActivityColor(config.color);

  const meta = entry.metadata as Record<string, unknown> | null;
  const desc = generateActivityDescription(entry.action, entry.resourceType, meta);
  const delayClass = index < 8 ? `vault-delay-${index + 1}` : "vault-delay-8";

  const userName =
    entry.userFirstName && entry.userLastName
      ? `${entry.userFirstName} ${entry.userLastName}`
      : (entry.userEmail ?? "System");

  return (
    <Box
      className={`vault-fade-up ${delayClass}`}
      sx={{ display: "flex", position: "relative", minHeight: 56 }}
    >
      {!isLast && (
        <Box
          sx={{
            position: "absolute",
            left: 15,
            top: 36,
            bottom: -4,
            width: 2,
            bgcolor: "divider",
          }}
        />
      )}

      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: (t) => alpha(t.palette[paletteKey].main, 0.12),
          color: config.color,
          flexShrink: 0,
          zIndex: 1,
          border: 2,
          borderColor: "background.default",
          "& .MuiSvgIcon-root": { fontSize: 16 },
        }}
      >
        {config.icon}
      </Box>

      <Box sx={{ flex: 1, ml: 1.5, pb: isLast ? 0 : 3, minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ flexWrap: "wrap", rowGap: 0.5 }}
        >
          <UserAvatar
            firstName={entry.userFirstName}
            lastName={entry.userLastName}
            email={entry.userEmail}
            avatarUrl={entry.userAvatarUrl}
            size={20}
          />
          <Typography
            variant="body2"
            fontWeight={600}
            component="span"
            noWrap
            sx={{ flexShrink: 0 }}
          >
            {userName}
          </Typography>
          <Typography variant="body2" color="text.secondary" component="span">
            {desc.summary}
          </Typography>
          {desc.highlight && (
            <Chip
              label={desc.highlight}
              size="small"
              sx={{
                height: 22,
                fontSize: "0.75rem",
                fontFamily: "monospace",
                bgcolor: (t) => alpha(t.palette[paletteKey].main, 0.08),
                color: config.color,
              }}
            />
          )}
          <Chip
            label={resourceLabel}
            size="small"
            variant="outlined"
            sx={{ height: 20, fontSize: "0.675rem" }}
          />
          <Chip
            label={entry.projectName}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ height: 20, fontSize: "0.675rem" }}
          />
        </Stack>

        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
          <Typography variant="caption" color="text.disabled">
            {formatRelativeTime(new Date(entry.createdAt))}
          </Typography>
          {desc.detail && (
            <Typography variant="caption" color="text.disabled">
              · {desc.detail}
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
