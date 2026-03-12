"use client";

import type { ReactElement } from "react";
import {
  BugReport as BugReportIcon,
  CompareArrows as CompareArrowsIcon,
  GppBad as GppBadIcon,
  ManageAccounts as ManageAccountsIcon,
  PersonAdd as PersonAddIcon,
  RotateRight as RotateRightIcon,
} from "@mui/icons-material";
import { Box, ListItemButton, ListItemIcon, Typography } from "@mui/material";
import type { Notification } from "@/types/api";
import { formatRelativeTime } from "@/utils/formatters";

interface NotificationItemProps {
  notification: Notification;
  onClick?: (notification: Notification) => void;
}

const TYPE_CONFIG: Record<string, { icon: ReactElement; color: string }> = {
  VULNERABILITY_FOUND: { icon: <BugReportIcon fontSize="small" />, color: "error.main" },
  SECRET_ROTATION: { icon: <RotateRightIcon fontSize="small" />, color: "warning.main" },
  ENV_DRIFT: { icon: <CompareArrowsIcon fontSize="small" />, color: "warning.light" },
  GIT_SECRET_DETECTION: { icon: <GppBadIcon fontSize="small" />, color: "error.main" },
  TEAM_INVITE: { icon: <PersonAddIcon fontSize="small" />, color: "success.main" },
  ROLE_CHANGE: { icon: <ManageAccountsIcon fontSize="small" />, color: "info.main" },
};

export function NotificationItem(props: NotificationItemProps): ReactElement {
  const { notification, onClick } = props;
  const config = TYPE_CONFIG[notification.type] ?? {
    icon: <BugReportIcon fontSize="small" />,
    color: "text.secondary",
  };

  return (
    <ListItemButton
      onClick={() => onClick?.(notification)}
      sx={{
        py: 1.5,
        px: 2,
        gap: 1.5,
        alignItems: "flex-start",
        borderLeft: notification.read ? "3px solid transparent" : "3px solid",
        borderLeftColor: notification.read ? "transparent" : "primary.main",
        bgcolor: notification.read ? "transparent" : "rgba(16, 185, 129, 0.04)",
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: "auto",
          mt: 0.5,
          color: config.color,
        }}
      >
        {config.icon}
      </ListItemIcon>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" fontWeight={notification.read ? 400 : 600} noWrap>
          {notification.title}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {notification.message}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
          {formatRelativeTime(notification.createdAt)}
        </Typography>
      </Box>
    </ListItemButton>
  );
}
