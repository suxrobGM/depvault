"use client";

import { type ReactElement } from "react";
import { DEFAULT_ROLES, SubscriptionPlanName, UserRole } from "@depvault/shared/constants";
import {
  AdminPanelSettings as AdminPanelSettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
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
  Tooltip,
  Typography,
} from "@mui/material";
import type { Route } from "next";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { NotificationBell } from "@/components/features/notifications";
import { VaultLockButton } from "@/components/features/vault";
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
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
  const displayName = user && [user.firstName, user.lastName].filter(Boolean).join(" ");

  const planBadgeColor =
    plan === SubscriptionPlanName.TEAM
      ? "secondary"
      : plan === SubscriptionPlanName.PRO
        ? "primary"
        : "default";

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
      {isAdmin && (
        <>
          <Divider />
          <List sx={{ px: open ? 1 : 0.5 }}>
            <ListItemButton
              selected={pathname.startsWith(ROUTES.admin)}
              onClick={() => {
                router.push(ROUTES.admin as Route);
                onMobileClose();
              }}
              sx={{
                justifyContent: open ? "initial" : "center",
                px: open ? 2 : 1.5,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: open ? 40 : "auto",
                  justifyContent: "center",
                  color: pathname.startsWith(ROUTES.admin) ? "primary.main" : "text.secondary",
                }}
              >
                <AdminPanelSettingsIcon />
              </ListItemIcon>
              {open && <ListItemText primary="Admin" />}
            </ListItemButton>
          </List>
        </>
      )}
      {user && (
        <>
          <Divider />
          {open ? (
            <List sx={{ px: 1, py: 0.5 }}>
              <FeedbackMenu open={open} />
              <VaultLockButton open={open} />
              <NotificationBell open={open} />
            </List>
          ) : (
            <Stack alignItems="center" spacing={0.5} sx={{ py: 0.75 }}>
              <FeedbackMenu open={open} />
              <VaultLockButton open={open} />
              <NotificationBell open={open} />
            </Stack>
          )}
          <Divider />
          <UserMenu
            trigger={
              <Tooltip title={open ? "" : displayName || user.email} placement="right">
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: open ? "flex-start" : "center",
                    gap: 1.5,
                    width: "100%",
                    cursor: "pointer",
                    borderRadius: 1.5,
                    mx: open ? 1 : 0.5,
                    px: open ? 1 : 0.5,
                    py: 1,
                    transition: "background-color 150ms",
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                  }}
                >
                  <Box sx={{ position: "relative", flexShrink: 0 }}>
                    <UserAvatar
                      firstName={user.firstName}
                      lastName={user.lastName}
                      email={user.email}
                      avatarUrl={user.avatarUrl}
                      size={34}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: 10,
                        height: 10,
                        bgcolor: "success.main",
                        borderRadius: "50%",
                        border: 2,
                        borderColor: "background.paper",
                      }}
                    />
                  </Box>
                  {open && (
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography variant="body2" noWrap fontWeight={600} sx={{ flex: 1 }}>
                          {displayName || user.email}
                        </Typography>
                        {showRoleBadge && (
                          <Chip
                            label={user.role}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontSize: "0.6rem", height: 18 }}
                          />
                        )}
                        <Chip
                          label={plan}
                          size="small"
                          color={planBadgeColor as "default" | "primary" | "secondary"}
                          variant="filled"
                          sx={{ fontSize: "0.6rem", height: 18 }}
                        />
                      </Stack>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        component="div"
                        sx={{ mt: 0.25 }}
                      >
                        {user.email}
                      </Typography>
                    </Box>
                  )}
                  {open && (
                    <ChevronRightIcon
                      sx={{ color: "text.disabled", fontSize: 16, flexShrink: 0 }}
                    />
                  )}
                </Box>
              </Tooltip>
            }
          />
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
