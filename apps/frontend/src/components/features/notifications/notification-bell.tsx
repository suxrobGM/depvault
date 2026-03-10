"use client";

import { useState, type ReactElement } from "react";
import { Notifications as NotificationsIcon } from "@mui/icons-material";
import { Badge, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { useUnreadCount } from "@/hooks/use-notifications";
import { NotificationDropdown } from "./notification-dropdown";

interface NotificationBellProps {
  open?: boolean;
}

export function NotificationBell(props: NotificationBellProps): ReactElement {
  const { open = true } = props;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { data } = useUnreadCount();
  const count = data?.count ?? 0;

  return (
    <>
      <ListItemButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          mb: 0.5,
          justifyContent: open ? "initial" : "center",
          px: open ? 2 : 1.5,
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: open ? 40 : "auto",
            justifyContent: "center",
            color: "text.secondary",
          }}
        >
          <Badge
            variant={open ? "standard" : "dot"}
            badgeContent={open ? count : undefined}
            color="error"
            max={99}
            invisible={count === 0}
          >
            <NotificationsIcon />
          </Badge>
        </ListItemIcon>
        {open && <ListItemText primary="Notifications" />}
      </ListItemButton>
      <NotificationDropdown anchorEl={anchorEl} onClose={() => setAnchorEl(null)} />
    </>
  );
}
