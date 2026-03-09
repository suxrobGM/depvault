"use client";

import type { ReactElement } from "react";
import { DEFAULT_ROLES } from "@depvault/shared/constants";
import { Add as AddIcon } from "@mui/icons-material";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { GradientText } from "@/components/ui/gradient-text";
import { useAuth } from "@/hooks/use-auth";
import { ROUTES } from "@/lib/constants";

export function DashboardGreeting(): ReactElement {
  const { user } = useAuth();

  const showRoleBadge = user?.role && !DEFAULT_ROLES.has(user.role);
  const displayName = user?.firstName ?? null;
  const greeting = displayName ? `Welcome back, ${displayName}` : "Welcome to DepVault";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Box
      className="vault-fade-up"
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        alignItems: { xs: "flex-start", sm: "center" },
        gap: 2,
        mb: 3,
      }}
    >
      <Box>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
          <GradientText variant="h4" component="h1">
            {greeting}
          </GradientText>
          {showRoleBadge && (
            <Chip label={user.role} size="small" color="primary" variant="outlined" />
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {today}
        </Typography>
      </Box>
      <Button
        component={Link}
        href={ROUTES.dashboard}
        variant="contained"
        startIcon={<AddIcon />}
        size="small"
      >
        New Project
      </Button>
    </Box>
  );
}
