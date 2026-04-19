"use client";

import { cloneElement, useState, type MouseEvent, type ReactElement } from "react";
import {
  Logout as LogoutIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import {
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/ui/data-display";
import { useAuth } from "@/hooks/use-auth";
import { ROUTES } from "@/lib/constants";

interface UserMenuProps {
  trigger: ReactElement<{ onClick?: (e: MouseEvent<HTMLElement>) => void }>;
}

export function UserMenu(props: UserMenuProps): ReactElement {
  const { trigger } = props;
  const { user, logout } = useAuth();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpen = (e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const displayName = user && [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <>
      {cloneElement(trigger, { onClick: handleOpen })}
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleClose}
        transformOrigin={{ horizontal: "left", vertical: "bottom" }}
        anchorOrigin={{ horizontal: "left", vertical: "top" }}
        slotProps={{ paper: { sx: { minWidth: 220 } } }}
      >
        {user && (
          <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
            <UserAvatar
              firstName={user.firstName}
              lastName={user.lastName}
              email={user.email}
              avatarUrl={user.avatarUrl}
              size={36}
            />
            <Box sx={{ minWidth: 0 }}>
              {displayName && (
                <Typography
                  variant="body2"
                  noWrap
                  sx={{
                    fontWeight: 600,
                  }}
                >
                  {displayName}
                </Typography>
              )}
              <Typography
                variant="caption"
                noWrap
                component="div"
                sx={{
                  color: "text.secondary",
                }}
              >
                {user.email}
              </Typography>
            </Box>
          </Box>
        )}
        <Divider />
        <MenuItem
          onClick={() => {
            handleClose();
            router.push(ROUTES.profileGeneral);
          }}
        >
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleClose();
            router.push(ROUTES.settings);
          }}
        >
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            handleClose();
            logout();
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
