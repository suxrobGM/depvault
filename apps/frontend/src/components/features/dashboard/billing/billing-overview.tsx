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
import { client } from "@/api/client";
import { useApiMutation } from "@/api/hooks";
import { queryKeys } from "@/api/query-keys";
import type { PortalSessionDto } from "@/api/types";
import { SkeletonList } from "@/components/ui/data-display/skeleton-list";
import { StatusBadge } from "@/components/ui/data-display/status-badge";
import { useConfirm } from "@/hooks/use-confirm";
import { useSubscription } from "@/hooks/use-subscription";
import { ROUTES } from "@/lib/constants";

interface UsageMeterProps {
  label: string;
  current: number;
  limit: number;
}

function UsageMeter(props: UsageMeterProps): ReactElement {
  const { label, current, limit } = props;
  const unlimited = isUnlimited(limit);
  const percentage = unlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isOverLimit = !unlimited && current >= limit;
  const isNearLimit = !unlimited && !isOverLimit && percentage >= 80;

  return (
    <Box>
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          mb: 0.5,
        }}
      >
        <Typography variant="body2Muted">{label}</Typography>
        <Typography variant="label" color={isOverLimit ? "error.main" : undefined}>
          {current} / {unlimited ? "Unlimited" : limit}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={unlimited ? 0 : percentage}
        color={isOverLimit ? "error" : isNearLimit ? "warning" : "primary"}
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

  const portalMutation = useApiMutation<PortalSessionDto>(
    () =>
      client.api.subscription.portal.post({
        returnUrl: ROUTES.billing,
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
      invalidateKeys: [queryKeys.subscription.current()],
    },
  );

  const resumeMutation = useApiMutation<{ message: string }>(
    () => client.api.subscription.resume.post(),
    {
      successMessage: "Subscription cancellation reversed",
      errorMessage: "Failed to resume subscription",
      invalidateKeys: [queryKeys.subscription.current()],
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
          <SkeletonList count={4} height={24} spacing={1.5} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Current Plan
          </Typography>
          <StatusBadge label={plan} variant={PLAN_VARIANT[plan] ?? "default"} />
          {subscription?.status === "PAST_DUE" && (
            <Chip label="Past Due" color="error" size="small" variant="outlined" />
          )}
          {subscription?.isComp && (
            <Chip label="Comp" color="warning" size="small" variant="outlined" />
          )}
        </Stack>

        {limits && usage && (
          <Stack spacing={2} sx={{ mb: 3 }}>
            <UsageMeter label="Projects" current={usage.projects} limit={limits.maxProjects} />
            <UsageMeter label="Files" current={usage.repoFiles} limit={limits.maxRepoFiles} />
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
                {subscription?.status === "PAST_DUE" && (
                  <Typography variant="label" sx={{ color: "error.main" }}>
                    Payment failed — please update your payment method to avoid losing access
                  </Typography>
                )}
                {subscription?.cancelAtPeriodEnd && (
                  <Typography variant="label" sx={{ color: "warning.main" }}>
                    {subscription.currentPeriodEnd
                      ? `Cancels on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                      : "Scheduled for cancellation"}
                    {" \u2014 you\u2019ll be downgraded to Free after this date"}
                  </Typography>
                )}
                {!subscription?.cancelAtPeriodEnd && subscription?.currentPeriodEnd && (
                  <Typography variant="body2Muted">
                    Next billing date:{" "}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </Typography>
                )}
                {subscription?.currentPeriodStart && (
                  <Typography variant="caption" sx={{ color: "text.disabled" }}>
                    Current period started:{" "}
                    {new Date(subscription.currentPeriodStart).toLocaleDateString()}
                  </Typography>
                )}
                {subscription?.isComp && (
                  <Typography variant="body2Muted">
                    This subscription was granted by an administrator — no billing applies
                  </Typography>
                )}
                {subscription?.quantity && subscription.quantity > 1 && (
                  <Typography variant="body2Muted">Seats: {subscription.quantity}</Typography>
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
