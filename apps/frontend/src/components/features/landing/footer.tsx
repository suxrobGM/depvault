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
    { label: "Dependency Analysis", href: "/docs/guides/dependency-analysis" },
    { label: "Environment Vault", href: "/docs/guides/environment-vault" },
    { label: "Secret Sharing", href: "/docs/guides/secret-sharing" },
    { label: "Format Converter", href: ROUTES.converter },
  ],
  Developers: [
    { label: "CLI Reference", href: "/docs/cli" },
    { label: "Getting Started", href: "/docs/getting-started" },
    { label: "CI/CD Integration", href: "/docs/guides/ci-cd-integration" },
    { label: "GitHub", href: "https://github.com/suxrobGM/depvault" },
  ],
  Security: [
    { label: "Encryption & Security", href: "/docs/guides/encryption" },
    { label: "Secret File Storage", href: "/docs/guides/secret-files" },
    { label: "Secret Scanning", href: "/docs/guides/secret-scanning" },
  ],
  Company: [
    { label: "Pricing", href: ROUTES.pricing },
    { label: "Documentation", href: ROUTES.docs },
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

  const isExternal = (href: string) =>
    href.startsWith("/docs") || href.startsWith("mailto:") || href.startsWith("https://");

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
                {links.map((link) =>
                  isExternal(link.href) ? (
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
                  ),
                )}
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
