"use client";

import type { ReactElement } from "react";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Shield as ShieldIcon,
  SwapHoriz as SwapHorizIcon,
} from "@mui/icons-material";
import {
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { usePathname, useRouter } from "next/navigation";
import { GradientText } from "@/components/ui/gradient-text";
import { useAuth } from "@/hooks/use-auth";
import { ROUTES } from "@/lib/constants";
import { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_WIDTH } from "./constants";

interface SidebarProps {
  open: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
}

const navItems = [
  { label: "Dashboard", icon: <DashboardIcon />, href: ROUTES.dashboard },
  { label: "Converter", icon: <SwapHorizIcon />, href: ROUTES.converter },
  { label: "Profile", icon: <PersonIcon />, href: ROUTES.profile },
];

export function Sidebar(props: SidebarProps): ReactElement {
  const { open, mobileOpen, onToggle, onMobileClose } = props;
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "space-between" : "center",
          px: open ? 2 : 0,
        }}
      >
        {open ? (
          <Stack direction="row" alignItems="center" spacing={1}>
            <ShieldIcon sx={{ color: "primary.main", fontSize: 24 }} />
            <GradientText variant="h6" component="span">
              DepVault
            </GradientText>
          </Stack>
        ) : (
          <ShieldIcon sx={{ color: "primary.main", fontSize: 24 }} />
        )}
        <IconButton onClick={onToggle} sx={{ display: { xs: "none", md: "flex" } }}>
          {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Toolbar>
      <Divider />
      <List sx={{ px: open ? 1 : 0.5, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <ListItemButton
              key={item.href}
              selected={isActive}
              onClick={() => {
                router.push(item.href);
                onMobileClose();
              }}
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
                  color: isActive ? "primary.main" : "text.secondary",
                }}
              >
                {item.icon}
              </ListItemIcon>
              {open && <ListItemText primary={item.label} />}
            </ListItemButton>
          );
        })}
      </List>
      {open && user && (
        <>
          <Divider />
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="body2" noWrap fontWeight={600}>
              {user.username}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary" noWrap>
                {user.email}
              </Typography>
              {user.role && (
                <Chip label={user.role} size="small" color="primary" variant="outlined" />
              )}
            </Stack>
          </Box>
        </>
      )}
    </Box>
  );

  return (
    <Box component="nav">
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { width: SIDEBAR_WIDTH },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            width: open ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH,
            transition: "width 225ms",
            overflowX: "hidden",
          },
        }}
        open={open}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}
