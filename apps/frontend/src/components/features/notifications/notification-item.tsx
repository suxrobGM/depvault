"use client";

import type { ReactElement } from "react";
import {
  BugReport as BugReportIcon,
  Circle as CircleIcon,
  CompareArrows as CompareArrowsIcon,
  GppBad as GppBadIcon,
  ManageAccounts as ManageAccountsIcon,
  PersonAdd as PersonAddIcon,
  RotateRight as RotateRightIcon,
} from "@mui/icons-material";
import { alpha, Box, ListItemButton, Stack, Typography } from "@mui/material";
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
        transition: "background-color 150ms",
        "&:hover": {
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
        },
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          mt: 0.25,
          bgcolor: (theme) =>
            alpha(
              theme.palette[config.color.split(".")[0] as "error" | "warning" | "success" | "info"]
                ?.main ?? theme.palette.text.secondary,
              0.12,
            ),
          color: config.color,
        }}
      >
        {config.icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Typography
            variant="body2"
            fontWeight={notification.read ? 400 : 600}
            noWrap
            sx={{ flex: 1 }}
          >
            {notification.title}
          </Typography>
          {!notification.read && (
            <CircleIcon sx={{ fontSize: 8, color: "primary.main", flexShrink: 0 }} />
          )}
        </Stack>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            mt: 0.25,
            lineHeight: 1.4,
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
