"use client";

import type { ReactElement, ReactNode } from "react";
import {
  CardGiftcard as CompIcon,
  Group as GroupIcon,
  AttachMoney as MoneyIcon,
  CreditCard as SubIcon,
} from "@mui/icons-material";
import { Box, Card, CardContent, Chip, Grid, Skeleton, Stack, Typography } from "@mui/material";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { AdminStatsResponse } from "@/types/api";

interface StatCardData {
  icon: ReactNode;
  label: string;
  value: string | number;
  color: string;
  chip?: string;
}

export function AdminStats(): ReactElement {
  const { data, isLoading } = useApiQuery<AdminStatsResponse>(
    ["admin-stats"],
    () => client.api.admin.stats.get(),
    { errorMessage: "Failed to load admin stats" },
  );

  const stats: StatCardData[] = [
    {
      icon: <GroupIcon />,
      label: "Total Users",
      value: data?.totalUsers ?? 0,
      color: "var(--mui-palette-primary-main)",
    },
    {
      icon: <MoneyIcon />,
      label: "Monthly Recurring Revenue",
      value: data ? `$${data.mrr.toFixed(2)}` : "$0.00",
      color: "var(--mui-palette-success-main)",
    },
    {
      icon: <SubIcon />,
      label: "Active Subscriptions",
      value: data?.activeSubscriptions ?? 0,
      color: "var(--mui-palette-info-main)",
      chip: data ? `${data.canceledSubscriptions} canceled` : undefined,
    },
    {
      icon: <CompIcon />,
      label: "Comp Subscriptions",
      value: data?.isCompCount ?? 0,
      color: "var(--mui-palette-warning-main)",
    },
  ];

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {stats.map((stat) => (
          <Grid key={stat.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: `${stat.color}1A`,
                      color: stat.color,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    {isLoading ? (
                      <Skeleton variant="text" width={60} height={36} />
                    ) : (
                      <Typography variant="h5" fontWeight={700} lineHeight={1.2}>
                        {stat.value}
                      </Typography>
                    )}
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="body2" color="text.secondary">
                        {stat.label}
                      </Typography>
                      {stat.chip && (
                        <Chip label={stat.chip} size="small" color="default" variant="outlined" />
                      )}
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Plan Breakdown
      </Typography>
      <Grid container spacing={2}>
        {(["free", "pro", "team"] as const).map((plan) => (
          <Grid key={plan} size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {plan.toUpperCase()}
                </Typography>
                {isLoading ? (
                  <Skeleton variant="text" width={40} height={40} />
                ) : (
                  <Typography variant="h4" fontWeight={700}>
                    {data?.planBreakdown?.[plan] ?? 0}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  users
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
