"use client";

import { useEffect, useRef, type ReactElement } from "react";
import { Box, Button, Divider, List, Popover, Skeleton, Stack, Typography } from "@mui/material";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from "@/hooks/use-notifications";
import { ROUTES } from "@/lib/constants";
import { NotificationItem } from "./notification-item";

interface NotificationDropdownProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

export function NotificationDropdown(props: NotificationDropdownProps): ReactElement {
  const { anchorEl, onClose } = props;
  const open = Boolean(anchorEl);

  const router = useRouter();
  const prevOpen = useRef(false);

  const { data, isLoading, refetch } = useNotifications({
    page: 1,
    limit: 5,
  });

  useEffect(() => {
    if (open && !prevOpen.current) {
      refetch();
    }
    prevOpen.current = open;
  }, [open, refetch]);

  const { data: countData } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const notifications = data?.items ?? [];
  const hasUnread = (countData?.count ?? 0) > 0;

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      transformOrigin={{ vertical: "bottom", horizontal: "left" }}
      slotProps={{
        paper: {
          sx: {
            width: 380,
            maxHeight: 500,
            bgcolor: "background.paper",
            border: 1,
            borderColor: "divider",
          },
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, py: 1.5 }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          Notifications
        </Typography>
        {hasUnread && (
          <Button
            size="small"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            Mark all read
          </Button>
        )}
      </Stack>
      <Divider />
      <List disablePadding sx={{ maxHeight: 360, overflowY: "auto" }}>
        {isLoading && (
          <Box sx={{ p: 2 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 1 }} />
            ))}
          </Box>
        )}
        {!isLoading && notifications.length === 0 && (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        )}
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClick={(n) => {
              if (!n.read) {
                markRead.mutate(n.id);
              }
              onClose();
              router.push(ROUTES.notifications as Route);
            }}
          />
        ))}
      </List>
      {notifications.length > 0 && (
        <>
          <Divider />
          <Box sx={{ p: 1, textAlign: "center" }}>
            <Button
              size="small"
              onClick={() => {
                onClose();
                router.push(ROUTES.notifications as Route);
              }}
            >
              See all notifications
            </Button>
          </Box>
        </>
      )}
    </Popover>
  );
}
