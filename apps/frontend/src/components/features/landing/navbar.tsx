"use client";

import { useEffect, useState, type ReactElement } from "react";
import { Close as CloseIcon, Menu as MenuIcon, Shield as ShieldIcon } from "@mui/icons-material";
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
import Link from "next/link";
import { GradientText } from "@/components/ui/gradient-text";
import { useScrollTo } from "@/hooks/use-scroll-to";
import { ROUTES } from "@/lib/constants";

const NAV_ITEMS = [
  { label: "Features", id: "features" },
  { label: "How It Works", id: "how-it-works" },
  { label: "Ecosystems", id: "ecosystems" },
];

export function LandingNavbar(): ReactElement {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const scrollTo = useScrollTo();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (id: string) => {
    setDrawerOpen(false);
    scrollTo(id);
  };

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
          <Link href={ROUTES.home} style={{ textDecoration: "none" }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <ShieldIcon sx={{ color: "primary.main", fontSize: 28 }} />
              <GradientText variant="h6" component="span">
                DepVault
              </GradientText>
            </Stack>
          </Link>
          <Stack
            direction="row"
            spacing={3}
            alignItems="center"
            sx={{ display: { xs: "none", md: "flex" }, flexGrow: 1, justifyContent: "center" }}
          >
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                color="inherit"
                size="small"
                sx={{ fontWeight: 500 }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
          <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              component={Link}
              href={ROUTES.login}
              color="inherit"
              size="small"
              sx={{ display: { xs: "none", sm: "inline-flex" } }}
            >
              Sign in
            </Button>
            <Button
              component={Link}
              href={ROUTES.register}
              variant="contained"
              size="small"
              sx={{ display: { xs: "none", sm: "inline-flex" } }}
            >
              Get Started
            </Button>
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
            <ListItemButton key={item.id} onClick={() => handleNavClick(item.id)}>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
        <Divider sx={{ my: 1 }} />
        <Stack spacing={1.5} sx={{ px: 2, py: 2 }}>
          <Button
            component={Link}
            href={ROUTES.login}
            color="inherit"
            fullWidth
            onClick={() => setDrawerOpen(false)}
          >
            Sign in
          </Button>
          <Button
            component={Link}
            href={ROUTES.register}
            variant="contained"
            fullWidth
            onClick={() => setDrawerOpen(false)}
          >
            Get Started
          </Button>
        </Stack>
      </Drawer>
    </>
  );
}
