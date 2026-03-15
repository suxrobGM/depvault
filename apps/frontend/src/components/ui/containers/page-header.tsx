import type { ReactElement, ReactNode } from "react";
import { ChevronRight as ChevronIcon } from "@mui/icons-material";
import { Box, Stack, Typography } from "@mui/material";
import type { Route } from "next";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: Route;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string | null;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export function PageHeader(props: PageHeaderProps): ReactElement {
  const { title, subtitle, actions, breadcrumbs } = props;

  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="flex-start"
      className="vault-fade-up"
      sx={{ mb: 3 }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Stack
            component="nav"
            aria-label="Breadcrumb"
            direction="row"
            alignItems="center"
            spacing={0}
            sx={{ mb: 1.5, flexWrap: "wrap", rowGap: 0.5 }}
          >
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              const isFirst = index === 0;

              return (
                <Stack
                  key={`${index}-${item.label}`}
                  direction="row"
                  alignItems="center"
                  spacing={0}
                >
                  {!isFirst && (
                    <ChevronIcon
                      sx={{
                        fontSize: 14,
                        color: "text.disabled",
                        mx: 0.5,
                      }}
                    />
                  )}
                  {item.href && !isLast ? (
                    <Link href={item.href} style={{ textDecoration: "none" }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          fontWeight: 500,
                          fontSize: "0.75rem",
                          letterSpacing: "0.01em",
                          transition: "color 0.15s ease",
                          "&:hover": { color: "primary.main" },
                        }}
                      >
                        {item.label}
                      </Typography>
                    </Link>
                  ) : (
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.75rem",
                        letterSpacing: "0.01em",
                        color: isLast ? "text.primary" : "text.secondary",
                      }}
                    >
                      {item.label}
                    </Typography>
                  )}
                </Stack>
              );
            })}
          </Stack>
        )}
        <Typography variant="h4" component="h1" gutterBottom={!!subtitle}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0, ml: 2 }}>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}
