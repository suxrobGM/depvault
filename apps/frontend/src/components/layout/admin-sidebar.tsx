"use client";

import { useState, type PropsWithChildren, type ReactElement } from "react";
import {
  ArrowBack as ArrowBackIcon,
  CreditCard as CreditCardIcon,
  Dashboard as DashboardIcon,
  Menu as MenuIcon,
  People as PeopleIcon,
} from "@mui/icons-material";
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import type { Route } from "next";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { ADMIN_SIDEBAR_WIDTH } from "./constants";

const navItems = [
  { label: "Dashboard", icon: <DashboardIcon />, href: ROUTES.admin },
  { label: "Users", icon: <PeopleIcon />, href: ROUTES.adminUsers },
  { label: "Subscriptions", icon: <CreditCardIcon />, href: ROUTES.adminSubscriptions },
];

export function AdminSidebar(props: PropsWithChildren): ReactElement {
  const { children } = props;
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ px: 2, py: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Image src="/depvault-logo-dark.svg" alt="DepVault" width={130} height={37} />
      </Box>
      <Box sx={{ px: 2, pb: 1 }}>
        <Typography
          variant="overline"
          sx={{
            color: "text.secondary",
            fontWeight: 700,
          }}
        >
          Admin Panel
        </Typography>
      </Box>
      <Divider />
      <List sx={{ px: 1, flex: 1 }}>
        {navItems.map((item) => {
          const isActive =
            item.href === ROUTES.admin
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <ListItemButton
              key={item.href}
              selected={isActive}
              onClick={() => {
                router.push(item.href as Route);
                setMobileOpen(false);
              }}
              sx={{ mb: 0.5, px: 2 }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: isActive ? "primary.main" : "text.secondary",
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
      <Divider />
      <List sx={{ px: 1 }}>
        <ListItemButton
          onClick={() => {
            router.push(ROUTES.dashboard as Route);
            setMobileOpen(false);
          }}
          sx={{ px: 2 }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: "text.secondary" }}>
            <ArrowBackIcon />
          </ListItemIcon>
          <ListItemText primary="Back to App" />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Box component="nav">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { width: ADMIN_SIDEBAR_WIDTH },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: ADMIN_SIDEBAR_WIDTH,
              boxSizing: "border-box",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flex: 1,
          p: 3,
          width: { md: `calc(100% - ${ADMIN_SIDEBAR_WIDTH}px)` },
          ml: { md: `${ADMIN_SIDEBAR_WIDTH}px` },
        }}
      >
        <IconButton
          onClick={() => setMobileOpen(true)}
          aria-label="Open admin menu"
          sx={{ display: { xs: "flex", md: "none" }, mb: 1 }}
        >
          <MenuIcon />
        </IconButton>
        {children}
      </Box>
    </Box>
  );
}
