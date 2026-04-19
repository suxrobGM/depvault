"use client";

import { useEffect, useRef, type ReactElement } from "react";
import {
  DoneAll as DoneAllIcon,
  NotificationsNone as NotificationsNoneIcon,
} from "@mui/icons-material";
import { Box, Button, Chip, Divider, List, Popover, Stack, Typography } from "@mui/material";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { SkeletonList } from "@/components/ui/data-display";
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
  const unreadCount = countData?.count ?? 0;

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
            borderRadius: 2,
            bgcolor: "background.paper",
            border: 1,
            borderColor: "divider",
          },
        },
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
            }}
          >
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Chip
              label={unreadCount}
              size="small"
              color="primary"
              sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600 }}
            />
          )}
        </Stack>
        {unreadCount > 0 && (
          <Button
            size="small"
            startIcon={<DoneAllIcon sx={{ fontSize: 16 }} />}
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            sx={{ textTransform: "none", fontSize: "0.75rem" }}
          >
            Mark all read
          </Button>
        )}
      </Stack>
      <Divider />
      <List
        disablePadding
        sx={{
          maxHeight: 360,
          overflowY: "auto",
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "action.hover",
            borderRadius: 3,
          },
        }}
      >
        {isLoading && (
          <Box sx={{ p: 2 }}>
            <SkeletonList count={3} variant="avatar" avatarSize={32} spacing={2} />
          </Box>
        )}
        {!isLoading && notifications.length === 0 && (
          <Box sx={{ py: 5, px: 3, textAlign: "center" }}>
            <NotificationsNoneIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontWeight: 500,
              }}
            >
              You&apos;re all caught up
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.disabled",
              }}
            >
              No new notifications
            </Typography>
          </Box>
        )}
        {notifications.map((notification, index) => (
          <Box key={notification.id}>
            {index > 0 && <Divider variant="inset" sx={{ ml: 6.5 }} />}
            <NotificationItem
              notification={notification}
              onClick={(n) => {
                if (!n.read) {
                  markRead.mutate(n.id);
                }
                onClose();
                router.push(ROUTES.notifications as Route);
              }}
            />
          </Box>
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
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              See all notifications
            </Button>
          </Box>
        </>
      )}
    </Popover>
  );
}
