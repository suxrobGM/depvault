"use client";

import type { ReactElement } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { ListSkeleton } from "@/components/ui/data-display/list-skeleton";
import { StatusBadge } from "@/components/ui/data-display/status-badge";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useSubscription } from "@/hooks/use-subscription";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { PortalSessionResponse } from "@/types/api";

interface UsageMeterProps {
  label: string;
  current: number;
  limit: number;
}

function UsageMeter(props: UsageMeterProps): ReactElement {
  const { label, current, limit } = props;
  const isUnlimited = limit === 0;
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {current} / {isUnlimited ? "Unlimited" : limit}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={isUnlimited ? 0 : percentage}
        color={isNearLimit ? "warning" : "primary"}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  );
}

const PLAN_VARIANT: Record<string, "default" | "info" | "success"> = {
  FREE: "default",
  PRO: "info",
  TEAM: "success",
};

export function BillingOverview(): ReactElement {
  const { subscription, plan, limits, usage, isLoading } = useSubscription();

  const portalMutation = useApiMutation<PortalSessionResponse>(
    () =>
      client.api.subscription.portal.post({
        returnUrl: `${window.location.origin}${ROUTES.billing}`,
      }),
    {
      errorMessage: "Failed to open billing portal",
      onSuccess: (data) => {
        window.location.href = data.url;
      },
    },
  );

  if (isLoading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <ListSkeleton count={4} height={24} spacing={1.5} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700}>
            Current Plan
          </Typography>
          <StatusBadge label={plan} variant={PLAN_VARIANT[plan] ?? "default"} />
          {subscription?.isComp && (
            <Chip label="Comp" color="warning" size="small" variant="outlined" />
          )}
        </Stack>

        {limits && usage && (
          <Stack spacing={2} sx={{ mb: 3 }}>
            <UsageMeter label="Projects" current={usage.projects} limit={limits.maxProjects} />
            <UsageMeter
              label="Environment Variables"
              current={usage.envVars}
              limit={limits.maxEnvVars}
            />
            <UsageMeter
              label="Secret Files"
              current={usage.secretFiles}
              limit={limits.maxSecretFiles}
            />
            <UsageMeter
              label="Analyses (this month)"
              current={usage.analyses}
              limit={limits.maxAnalysesPerMonth}
            />
            <UsageMeter label="Team Members" current={usage.members} limit={limits.maxUsers} />
            <UsageMeter
              label="Active CI Tokens"
              current={usage.ciTokens}
              limit={limits.maxCiTokens}
            />
          </Stack>
        )}

        {plan !== "FREE" && !subscription?.isComp && (
          <>
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              {subscription?.currentPeriodEnd && (
                <Typography variant="body2" color="text.secondary">
                  Next billing date: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </Typography>
              )}
              <Button
                variant="outlined"
                onClick={() => portalMutation.mutate(undefined)}
                disabled={portalMutation.isPending}
              >
                {portalMutation.isPending ? "Loading..." : "Manage Subscription"}
              </Button>
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
}
