"use client";

import type { ReactElement } from "react";
import { isUnlimited, SubscriptionPlanName } from "@depvault/shared/constants";
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
import { useConfirm } from "@/hooks/use-confirm";
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
  const unlimited = isUnlimited(limit);
  const percentage = unlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = !unlimited && percentage >= 80;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {current} / {unlimited ? "Unlimited" : limit}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={unlimited ? 0 : percentage}
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
  const confirm = useConfirm();

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

  const cancelMutation = useApiMutation<{ message: string }>(
    () => client.api.subscription.cancel.post(),
    {
      successMessage: "Subscription will cancel at the end of the billing period",
      errorMessage: "Failed to cancel subscription",
      invalidateKeys: [["subscription"]],
    },
  );

  const resumeMutation = useApiMutation<{ message: string }>(
    () => client.api.subscription.resume.post(),
    {
      successMessage: "Subscription cancellation reversed",
      errorMessage: "Failed to resume subscription",
      invalidateKeys: [["subscription"]],
    },
  );

  const handleCancel = async () => {
    const confirmed = await confirm({
      title: "Cancel Subscription",
      description:
        "Your subscription will remain active until the end of the current billing period. After that, you'll be downgraded to the Free plan.",
      confirmLabel: "Cancel Subscription",
      destructive: true,
    });

    if (confirmed) {
      cancelMutation.mutate();
    }
  };

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

        {plan !== SubscriptionPlanName.FREE && (
          <>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={1.5}>
              <Stack spacing={0.5}>
                {subscription?.cancelAtPeriodEnd && (
                  <Typography variant="body2" color="warning.main" fontWeight={600}>
                    {subscription.currentPeriodEnd
                      ? `Cancels on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                      : "Scheduled for cancellation"}
                    {" - you\u2019ll be downgraded to Free after this date"}
                  </Typography>
                )}

                {!subscription?.cancelAtPeriodEnd && subscription?.currentPeriodEnd && (
                  <Typography variant="body2" color="text.secondary">
                    Next billing date:{" "}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </Typography>
                )}
                {subscription?.currentPeriodStart && (
                  <Typography variant="caption" color="text.disabled">
                    Current period started:{" "}
                    {new Date(subscription.currentPeriodStart).toLocaleDateString()}
                  </Typography>
                )}
                {subscription?.isComp && (
                  <Typography variant="body2" color="text.secondary">
                    This subscription was granted by an administrator — no billing applies
                  </Typography>
                )}
                {subscription?.quantity && subscription.quantity > 1 && (
                  <Typography variant="body2" color="text.secondary">
                    Seats: {subscription.quantity}
                  </Typography>
                )}
              </Stack>

              {!subscription?.isComp && (
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="outlined"
                    onClick={() => portalMutation.mutate(undefined)}
                    disabled={portalMutation.isPending}
                  >
                    {portalMutation.isPending ? "Loading..." : "Manage Billing"}
                  </Button>
                  {subscription?.cancelAtPeriodEnd ? (
                    <Button
                      variant="contained"
                      onClick={() => resumeMutation.mutate(undefined)}
                      disabled={resumeMutation.isPending}
                    >
                      {resumeMutation.isPending ? "Resuming..." : "Resume Subscription"}
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleCancel}
                      disabled={cancelMutation.isPending}
                    >
                      {cancelMutation.isPending ? "Canceling..." : "Cancel Subscription"}
                    </Button>
                  )}
                </Stack>
              )}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
}
