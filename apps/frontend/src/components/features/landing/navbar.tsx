"use client";

import { useEffect, useState, type ReactElement } from "react";
import { Close as CloseIcon, Menu as MenuIcon } from "@mui/icons-material";
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
} from "@mui/material";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { LinkButton } from "@/components/ui/inputs";
import { ROUTES } from "@/lib/constants";

type NavItem = { label: string; href: Route };

const NAV_ITEMS: NavItem[] = [
  { label: "Features", href: `${ROUTES.home}#features` },
  { label: "How It Works", href: `${ROUTES.home}#how-it-works` },
  { label: "Ecosystems", href: `${ROUTES.home}#ecosystems` },
  { label: "Pricing", href: ROUTES.pricing },
  { label: "Docs", href: ROUTES.docs },
];

export function LandingNavbar(): ReactElement {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        aria-label="Main navigation"
        sx={{
          bgcolor: scrolled ? "vault.glassBg" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? 1 : 0,
          borderColor: "vault.glassBorder",
          transition: "all 0.3s ease",
        }}
      >
        <Toolbar sx={{ maxWidth: "lg", width: "100%", mx: "auto" }}>
          <Link href={ROUTES.home} style={{ textDecoration: "none", display: "flex" }}>
            <Image src="/depvault-logo-dark.svg" alt="DepVault" width={140} height={40} priority />
          </Link>
          <Stack
            direction="row"
            spacing={3}
            sx={{
              alignItems: "center",
              display: { xs: "none", md: "flex" },
              flexGrow: 1,
              justifyContent: "center",
            }}
          >
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.label}
                component="a"
                href={item.href}
                color="inherit"
                size="small"
                sx={{ fontWeight: 500 }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
          <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />
          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              alignItems: "center",
            }}
          >
            <LinkButton
              href={ROUTES.login}
              color="inherit"
              size="small"
              sx={{ display: { xs: "none", sm: "inline-flex" } }}
            >
              Sign in
            </LinkButton>
            <LinkButton
              href={ROUTES.register}
              variant="contained"
              size="small"
              sx={{ display: { xs: "none", sm: "inline-flex" } }}
            >
              Get Started
            </LinkButton>
            <IconButton
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              sx={{ display: { md: "none" }, color: "text.primary" }}
            >
              <MenuIcon />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: 280,
              bgcolor: "background.paper",
              backgroundImage: "none",
            },
          },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
          <IconButton aria-label="Close menu" onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <List sx={{ px: 1 }}>
          {NAV_ITEMS.map((item) => (
            <ListItemButton
              key={item.label}
              component="a"
              href={item.href}
              onClick={() => setDrawerOpen(false)}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
        <Divider sx={{ my: 1 }} />
        <Stack spacing={1.5} sx={{ px: 2, py: 2 }}>
          <LinkButton
            href={ROUTES.login}
            color="inherit"
            fullWidth
            onClick={() => setDrawerOpen(false)}
          >
            Sign in
          </LinkButton>
          <LinkButton
            href={ROUTES.register}
            variant="contained"
            fullWidth
            onClick={() => setDrawerOpen(false)}
          >
            Get Started
          </LinkButton>
        </Stack>
      </Drawer>
    </>
  );
}
