"use client";

import type { ReactElement } from "react";
import { Shield as ShieldIcon } from "@mui/icons-material";
import { Box, Divider, Grid, Link as MuiLink, Stack, Typography } from "@mui/material";
import NextLink from "next/link";
import { GradientText } from "@/components/ui/gradient-text";
import { SectionContainer } from "@/components/ui/section-container";
import { ROUTES } from "@/lib/constants";

const footerLinks = {
  Product: [
    { label: "Dashboard", href: ROUTES.dashboard },
    { label: "Converter", href: ROUTES.converter },
    { label: "Pricing", href: "#" },
  ],
  Security: [
    { label: "AES-256 Encryption", href: "#features" },
    { label: "One-Time Links", href: "#features" },
    { label: "Zero-Knowledge", href: "#features" },
  ],
  Account: [
    { label: "Sign In", href: ROUTES.login },
    { label: "Register", href: ROUTES.register },
    { label: "Profile", href: ROUTES.profile },
  ],
};

export function LandingFooter(): ReactElement {
  return (
    <Box component="footer">
      <Divider />
      <SectionContainer sx={{ py: { xs: 5, md: 8 } }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <ShieldIcon sx={{ color: "primary.main", fontSize: 24 }} />
              <GradientText variant="h6" component="span">
                DepVault
              </GradientText>
            </Stack>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 280, lineHeight: 1.7 }}
            >
              Analyze dependencies, detect vulnerabilities, and securely store environment variables
              across any tech stack.
            </Typography>
          </Grid>
          {Object.entries(footerLinks).map(([category, links]) => (
            <Grid key={category} size={{ xs: 6, sm: 4, md: 2 }}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ mb: 1.5, display: "block", letterSpacing: "0.1em" }}
              >
                {category}
              </Typography>
              <Stack spacing={1}>
                {links.map((link) => (
                  <MuiLink
                    key={link.label}
                    component={NextLink}
                    href={link.href}
                    underline="none"
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      transition: "color 0.2s",
                      "&:hover": { color: "primary.main" },
                    }}
                  >
                    {link.label}
                  </MuiLink>
                ))}
              </Stack>
            </Grid>
          ))}
        </Grid>
        <Divider sx={{ my: 4 }} />
        <Typography variant="caption" color="text.secondary">
          &copy; {new Date().getFullYear()} DepVault. All rights reserved.
        </Typography>
      </SectionContainer>
    </Box>
  );
}
