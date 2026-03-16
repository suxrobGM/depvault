"use client";

import type { ReactElement } from "react";
import {
  ArrowBack as ArrowBackIcon,
  CreditCard as CreditCardIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
} from "@mui/icons-material";
import {
  Box,
  Divider,
  Drawer,
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

const ADMIN_SIDEBAR_WIDTH = 260;

const navItems = [
  { label: "Dashboard", icon: <DashboardIcon />, href: ROUTES.admin },
  { label: "Users", icon: <PeopleIcon />, href: ROUTES.adminUsers },
  { label: "Subscriptions", icon: <CreditCardIcon />, href: ROUTES.adminSubscriptions },
];

export function AdminSidebar(): ReactElement {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: ADMIN_SIDEBAR_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: ADMIN_SIDEBAR_WIDTH,
          boxSizing: "border-box",
        },
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Box sx={{ px: 2, py: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Image src="/depvault-logo-dark.svg" alt="DepVault" width={130} height={37} />
        </Box>
        <Box sx={{ px: 2, pb: 1 }}>
          <Typography variant="overline" color="text.secondary" fontWeight={700}>
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
                onClick={() => router.push(item.href as Route)}
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
          <ListItemButton onClick={() => router.push(ROUTES.dashboard as Route)} sx={{ px: 2 }}>
            <ListItemIcon sx={{ minWidth: 40, color: "text.secondary" }}>
              <ArrowBackIcon />
            </ListItemIcon>
            <ListItemText primary="Back to App" />
          </ListItemButton>
        </List>
      </Box>
    </Drawer>
  );
}
