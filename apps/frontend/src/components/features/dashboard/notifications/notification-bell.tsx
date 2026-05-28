"use client";

import { useState, type ReactElement } from "react";
import { Notifications as NotificationsIcon } from "@mui/icons-material";
import {
  Badge,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";
import { useUnreadCount } from "@/hooks/use-notifications";
import { NotificationDropdown } from "./notification-dropdown";

interface NotificationBellProps {
  open: boolean;
}

export function NotificationBell(props: NotificationBellProps): ReactElement {
  const { open } = props;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { data } = useUnreadCount();
  const count = data?.count ?? 0;

  const badge = (
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
      <NotificationsIcon />
    </Badge>
  );

  return (
    <>
      {open ? (
        <ListItemButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ mb: 0.5, px: 2 }}>
          <ListItemIcon sx={{ minWidth: 40, color: "text.secondary" }}>{badge}</ListItemIcon>
          <ListItemText primary="Notifications" />
        </ListItemButton>
      ) : (
        <Tooltip title="Notifications" placement="right">
          <IconButton
            size="small"
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{ color: "text.secondary" }}
          >
            {badge}
          </IconButton>
        </Tooltip>
      )}
      <NotificationDropdown anchorEl={anchorEl} onClose={() => setAnchorEl(null)} />
    </>
  );
}
