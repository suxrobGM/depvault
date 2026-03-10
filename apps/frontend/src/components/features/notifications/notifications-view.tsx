"use client";

import { useState, type ReactElement } from "react";
import { Delete as DeleteIcon, DoneAll as DoneAllIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  IconButton,
  List,
  Skeleton,
  Stack,
  TablePagination,
  Tooltip,
  Typography,
} from "@mui/material";
import { GlassCard } from "@/components/ui/glass-card";
import {
  useDeleteNotification,
  useMarkAllRead,
  useMarkRead,
  useNotifications,
} from "@/hooks/use-notifications";
import type { NotificationType } from "@/types/api/notification";
import { NotificationFilters } from "./notification-filters";
import { NotificationItem } from "./notification-item";

export function NotificationsView(): ReactElement {
  const [readFilter, setReadFilter] = useState<"all" | "read" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<NotificationType | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const filters = {
    page: page + 1,
    limit: rowsPerPage,
    ...(readFilter !== "all" && { read: readFilter === "read" }),
    ...(typeFilter && { type: typeFilter }),
  };

  const { data, isLoading } = useNotifications(filters);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const deleteNotification = useDeleteNotification();

  const notifications = data?.items ?? [];
  const total = data?.pagination?.total ?? 0;

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
        flexWrap="wrap"
        gap={1}
      >
        <NotificationFilters
          readFilter={readFilter}
          typeFilter={typeFilter}
          onReadFilterChange={(v) => {
            setReadFilter(v);
            setPage(0);
          }}
          onTypeFilterChange={(v) => {
            setTypeFilter(v);
            setPage(0);
          }}
        />
        <Button
          size="small"
          startIcon={<DoneAllIcon />}
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
        >
          Mark all read
        </Button>
      </Stack>

      <GlassCard hoverGlow={false}>
        <List disablePadding>
          {isLoading &&
            [0, 1, 2, 3, 4].map((i) => (
              <Box key={i} sx={{ p: 2 }}>
                <Skeleton variant="rectangular" height={52} sx={{ borderRadius: 1 }} />
              </Box>
            ))}
          {!isLoading && notifications.length === 0 && (
            <Box sx={{ p: 6, textAlign: "center" }}>
              <Typography variant="body1" color="text.secondary">
                No notifications found
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {readFilter !== "all" || typeFilter
                  ? "Try adjusting your filters"
                  : "You're all caught up!"}
              </Typography>
            </Box>
          )}
          {notifications.map((notification) => (
            <Stack
              key={notification.id}
              direction="row"
              alignItems="center"
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                "&:last-child": { borderBottom: 0 },
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <NotificationItem
                  notification={notification}
                  onClick={(n) => {
                    if (!n.read) markRead.mutate(n.id);
                  }}
                />
              </Box>
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  onClick={() => deleteNotification.mutate(notification.id)}
                  sx={{ mr: 1, color: "text.disabled", "&:hover": { color: "error.main" } }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}
        </List>
        {total > rowsPerPage && (
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 20, 50]}
          />
        )}
      </GlassCard>
    </Box>
  );
}
