"use client";

import { useEffect, useState, type ReactElement } from "react";
import { Shield as ShieldIcon } from "@mui/icons-material";
import { AppBar, Box, Button, Stack, Toolbar } from "@mui/material";
import Link from "next/link";
import { GradientText } from "@/components/ui/gradient-text";
import { ROUTES } from "@/lib/constants";

export function LandingNavbar(): ReactElement {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AppBar
      position="fixed"
      color="transparent"
      elevation={0}
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
        <Box sx={{ flexGrow: 1 }} />
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button component={Link} href={ROUTES.login} color="inherit" size="small">
            Sign in
          </Button>
          <Button component={Link} href={ROUTES.register} variant="contained" size="small">
            Get Started
          </Button>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
