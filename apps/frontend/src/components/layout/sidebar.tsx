"use client";

import { type ReactElement } from "react";
import { DEFAULT_ROLES } from "@depvault/shared/constants";
import {
  ChevronLeft as ChevronLeftIcon,
  CreditCard as CreditCardIcon,
  Dashboard as DashboardIcon,
  Folder as FolderIcon,
  History as HistoryIcon,
  Security as SecurityNavIcon,
  Settings as SettingsIcon,
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
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { NotificationBell } from "@/components/features/notifications";
import { UserAvatar } from "@/components/ui/data-display";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { ROUTES } from "@/lib/constants";
import { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_WIDTH } from "./constants";
import { FeedbackMenu } from "./feedback-menu";
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
  { label: "Billing", icon: <CreditCardIcon />, href: ROUTES.billing },
  { label: "Settings", icon: <SettingsIcon />, href: ROUTES.settings },
];

const allHrefs = navItems.map((item) => item.href);

function isNavItemActive(href: string, pathname: string): boolean {
  const matchesPath = pathname === href || pathname.startsWith(href + "/");
  if (!matchesPath) {
    return false;
  }

  return !allHrefs.some(
    (other) =>
      other !== href &&
      other.startsWith(href) &&
      (pathname === other || pathname.startsWith(other + "/")),
  );
}

export function Sidebar(props: SidebarProps): ReactElement {
  const { open, mobileOpen, onToggle, onMobileClose } = props;

  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { plan } = useSubscription();
  const showRoleBadge = user?.role && !DEFAULT_ROLES.has(user.role);

  const planBadgeColor = plan === "TEAM" ? "secondary" : plan === "PRO" ? "primary" : "default";

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
            <Image src="/depvault-logo-dark.svg" alt="DepVault" width={130} height={37} />
            <IconButton onClick={onToggle} sx={{ display: { xs: "none", md: "flex" } }}>
              <ChevronLeftIcon />
            </IconButton>
          </>
        ) : (
          <IconButton onClick={onToggle} sx={{ display: { xs: "none", md: "flex" } }}>
            <Image src="/depvault-icon.svg" alt="DepVault" width={24} height={30} />
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      <List sx={{ px: open ? 1 : 0.5, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = isNavItemActive(item.href, pathname);
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
      <FeedbackMenu open={open} />
      <Divider />
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
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          sx={{ flex: 1 }}
                        >
                          {user.email}
                        </Typography>
                        {showRoleBadge && (
                          <Chip label={user.role} size="small" color="primary" variant="outlined" />
                        )}
                        <Chip
                          label={plan}
                          size="small"
                          color={planBadgeColor as "default" | "primary" | "secondary"}
                          variant="filled"
                          onClick={() => router.push(ROUTES.billing as Route)}
                          sx={{ fontSize: "0.65rem", height: 20, cursor: "pointer" }}
                        />
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
