"use client";

import type { ReactElement } from "react";
import { DEFAULT_ROLES } from "@depvault/shared/constants";
import {
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  Folder as FolderIcon,
  History as HistoryIcon,
  Security as SecurityNavIcon,
  Settings as SettingsIcon,
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
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { NotificationBell } from "@/components/features/notifications";
import { GradientText } from "@/components/ui/gradient-text";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { ROUTES } from "@/lib/constants";
import { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_WIDTH } from "./constants";
import { UserMenu } from "./user-menu";

interface SidebarProps {
  open: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
}

const navItems = [
  { label: "Dashboard", icon: <DashboardIcon />, href: ROUTES.dashboard },
  { label: "Projects", icon: <FolderIcon />, href: ROUTES.projects },
  { label: "Activity", icon: <HistoryIcon />, href: ROUTES.activity },
  { label: "Security", icon: <SecurityNavIcon />, href: ROUTES.security },
  { label: "Converter", icon: <SwapHorizIcon />, href: ROUTES.converter },
  { label: "Settings", icon: <SettingsIcon />, href: ROUTES.settings },
];

export function Sidebar(props: SidebarProps): ReactElement {
  const { open, mobileOpen, onToggle, onMobileClose } = props;

  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const showRoleBadge = user?.role && !DEFAULT_ROLES.has(user.role);

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "space-between" : "center",
          px: open ? 2 : 0,
          minHeight: open ? undefined : 56,
        }}
      >
        {open ? (
          <>
            <Stack direction="row" alignItems="center" spacing={1}>
              <ShieldIcon sx={{ color: "primary.main", fontSize: 24 }} />
              <GradientText variant="h6" component="span">
                DepVault
              </GradientText>
            </Stack>
            <IconButton onClick={onToggle} sx={{ display: { xs: "none", md: "flex" } }}>
              <ChevronLeftIcon />
            </IconButton>
          </>
        ) : (
          <IconButton onClick={onToggle} sx={{ display: { xs: "none", md: "flex" } }}>
            <ShieldIcon sx={{ color: "primary.main", fontSize: 24 }} />
          </IconButton>
        )}
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
                router.push(item.href as Route);
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
      {user && (
        <>
          <List sx={{ px: open ? 1 : 0.5 }}>
            <NotificationBell open={open} />
          </List>
          <Divider />
          <Box
            sx={{
              px: open ? 2 : 0,
              py: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: open ? "flex-start" : "center",
              gap: 1.5,
            }}
          >
            <UserMenu
              trigger={
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: open ? "flex-start" : "center",
                    gap: 1.5,
                    width: "100%",
                    cursor: "pointer",
                    borderRadius: 1,
                    "&:hover": { bgcolor: "action.hover" },
                    p: 0.5,
                  }}
                >
                  <UserAvatar
                    firstName={user.firstName}
                    lastName={user.lastName}
                    email={user.email}
                    avatarUrl={user.avatarUrl}
                    size={32}
                  />
                  {open && (
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" noWrap fontWeight={600}>
                        {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {user.email}
                        </Typography>
                        {showRoleBadge && (
                          <Chip label={user.role} size="small" color="primary" variant="outlined" />
                        )}
                      </Stack>
                    </Box>
                  )}
                </Box>
              }
            />
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
