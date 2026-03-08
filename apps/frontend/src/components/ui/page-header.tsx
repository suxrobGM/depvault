import type { ReactElement, ReactNode } from "react";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import { Box, Breadcrumbs, Stack, Typography } from "@mui/material";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
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
      <Box>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 1 }}>
            {breadcrumbs.map((item) =>
              item.href ? (
                <Link key={item.label} href={item.href}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ "&:hover": { color: "primary.main" } }}
                  >
                    {item.label}
                  </Typography>
                </Link>
              ) : (
                <Typography key={item.label} variant="body2" color="text.primary">
                  {item.label}
                </Typography>
              ),
            )}
          </Breadcrumbs>
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
        <Stack direction="row" spacing={1}>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}
