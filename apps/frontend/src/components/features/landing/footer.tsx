"use client";

import type { MouseEvent, ReactElement } from "react";
import { GitHub as GitHubIcon } from "@mui/icons-material";
import { Box, Divider, Grid, IconButton, Link as MuiLink, Stack, Typography } from "@mui/material";
import type { Route } from "next";
import Image from "next/image";
import NextLink from "next/link";
import { SectionContainer } from "@/components/ui/containers";
import { useScrollTo } from "@/hooks/use-scroll-to";
import { ROUTES } from "@/lib/constants";

interface FooterLink {
  label: string;
  href: string;
}

const footerLinks: Record<string, FooterLink[]> = {
  Product: [
    { label: "Dashboard", href: ROUTES.dashboard },
    { label: "Dependency Analysis", href: "#features" },
    { label: "Environment Vault", href: "#features" },
    { label: "Format Converter", href: ROUTES.converter },
  ],
  Security: [
    { label: "AES-256-GCM Encryption", href: "#features" },
    { label: "Secret File Storage", href: "#features" },
    { label: "One-Time Sharing", href: "#features" },
    { label: "Git Secret Detection", href: "#features" },
  ],
  Account: [
    { label: "Sign In", href: ROUTES.login },
    { label: "Register", href: ROUTES.register },
    { label: "Profile", href: ROUTES.profileGeneral },
  ],
  Resources: [
    { label: "Documentation", href: ROUTES.docs },
    { label: "Pricing", href: ROUTES.pricing },
    { label: "Terms of Service", href: ROUTES.terms },
    { label: "Privacy Policy", href: ROUTES.privacy },
    { label: "Support", href: "mailto:support@depvault.com" },
  ],
};

const linkSx = {
  color: "text.secondary",
  transition: "color 0.2s",
  "&:hover": { color: "primary.main" },
};

export function LandingFooter(): ReactElement {
  const scrollTo = useScrollTo();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#") && href.length > 1) {
      e.preventDefault();
      scrollTo(href.slice(1));
    }
  };

  return (
    <Box component="footer">
      <Divider />
      <SectionContainer sx={{ py: { xs: 5, md: 8 } }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ mb: 2 }}>
              <Image src="/depvault-logo-dark.svg" alt="DepVault" width={140} height={40} />
            </Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 280, lineHeight: 1.7, mb: 2 }}
            >
              Analyze dependencies, detect vulnerabilities, and securely store environment variables
              and secret files across any tech stack.
            </Typography>
            <IconButton
              component="a"
              href="https://github.com/suxrobGM/depvault"
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
              aria-label="GitHub"
            >
              <GitHubIcon fontSize="small" />
            </IconButton>
          </Grid>
          {Object.entries(footerLinks).map(([category, links]) => (
            <Grid key={category} size={{ xs: 6, sm: 3, md: 2 }}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ mb: 1.5, display: "block", letterSpacing: "0.1em" }}
              >
                {category}
              </Typography>
              <Stack spacing={1}>
                {links.map((link) => {
                  const isExternal = link.href === ROUTES.docs || link.href.startsWith("mailto:");

                  return isExternal ? (
                    <MuiLink
                      key={link.label}
                      href={link.href}
                      underline="none"
                      variant="body2"
                      sx={linkSx}
                    >
                      {link.label}
                    </MuiLink>
                  ) : (
                    <MuiLink
                      key={link.label}
                      component={NextLink}
                      href={link.href as Route}
                      underline="none"
                      variant="body2"
                      onClick={(e: MouseEvent<HTMLAnchorElement>) => handleClick(e, link.href)}
                      sx={linkSx}
                    >
                      {link.label}
                    </MuiLink>
                  );
                })}
              </Stack>
            </Grid>
          ))}
        </Grid>
        <Divider sx={{ my: 4 }} />
        <Typography variant="caption" color="text.secondary">
          &copy; 2026 DepVault. All rights reserved.
        </Typography>
      </SectionContainer>
    </Box>
  );
}
