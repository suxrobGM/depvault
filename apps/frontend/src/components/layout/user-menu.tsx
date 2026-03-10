"use client";

import { useState, type MouseEvent, type ReactElement } from "react";
import { Logout as LogoutIcon, Person as PersonIcon } from "@mui/icons-material";
import {
  Avatar,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ROUTES } from "@/lib/constants";

export function UserMenu(): ReactElement {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpen = (e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : (user?.email?.slice(0, 2).toUpperCase() ?? "?");

  return (
    <>
      <IconButton onClick={handleOpen} size="small" aria-label="User menu">
        <Avatar src={user?.avatarUrl ?? undefined} sx={{ width: 32, height: 32, fontSize: 14 }}>
          {initials}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        slotProps={{ paper: { sx: { minWidth: 200 } } }}
      >
        {user && (
          <MenuItem disabled sx={{ opacity: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              {user.email}
            </Typography>
          </MenuItem>
        )}
        <Divider />
        <MenuItem
          onClick={() => {
            handleClose();
            router.push(ROUTES.profile);
          }}
        >
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            handleClose();
            logout();
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
