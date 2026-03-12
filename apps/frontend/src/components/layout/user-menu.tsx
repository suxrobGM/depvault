"use client";

import { cloneElement, useState, type MouseEvent, type ReactElement } from "react";
import { Logout as LogoutIcon, Person as PersonIcon } from "@mui/icons-material";
import { Divider, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
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

  return (
    <>
      {cloneElement(trigger, { onClick: handleOpen })}
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleClose}
        transformOrigin={{ horizontal: "left", vertical: "bottom" }}
        anchorOrigin={{ horizontal: "left", vertical: "top" }}
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
            router.push(ROUTES.profileGeneral);
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
