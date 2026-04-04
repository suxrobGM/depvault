"use client";

import { useState, type ReactElement } from "react";
import { Notifications as NotificationsIcon } from "@mui/icons-material";
import { Badge, IconButton, Tooltip } from "@mui/material";
import { useUnreadCount } from "@/hooks/use-notifications";
import { NotificationDropdown } from "./notification-dropdown";

export function NotificationBell(): ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { data } = useUnreadCount();
  const count = data?.count ?? 0;

  return (
    <>
      <Tooltip title="Notifications" placement="top">
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ color: "text.secondary" }}
        >
          <Badge
            badgeContent={count}
            max={99}
            invisible={count === 0}
            sx={{
              "& .MuiBadge-badge": {
                fontSize: "0.6rem",
                height: 16,
                minWidth: 16,
                bgcolor: "text.secondary",
                color: "background.paper",
              },
            }}
          >
            <NotificationsIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>
      <NotificationDropdown anchorEl={anchorEl} onClose={() => setAnchorEl(null)} />
    </>
  );
}
