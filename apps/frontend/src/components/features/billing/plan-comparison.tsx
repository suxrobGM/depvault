"use client";

import { useState, type ReactElement } from "react";
import {
  PLAN_ORDER,
  SubscriptionPlanName,
  type SubscriptionPlanValue,
} from "@depvault/shared/constants";
import { CheckCircleOutlined as CheckIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { StatusBadge } from "@/components/ui/data-display/status-badge";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useConfirm } from "@/hooks/use-confirm";
import { useSubscription } from "@/hooks/use-subscription";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { CheckoutSessionResponse, CreateCheckoutBody } from "@/types/api";

interface PlanDef {
  name: string;
  key: SubscriptionPlanValue;
  price: string;
  description: string;
  features: string[];
}

const PLANS: PlanDef[] = [
  {
    name: "Free",
    key: SubscriptionPlanName.FREE,
    price: "$0",
    description: "For individual developers",
    features: [
      "3 projects",
      "100 env variables",
      "10 secret files",
      "30 analyses / month",
      "5 active CI/CD tokens",
      "Secret sharing",
      "CLI access",
    ],
  },
  {
    name: "Pro",
    key: SubscriptionPlanName.PRO,
    price: "$5",
    description: "Per user / month",
    features: [
      "20 projects",
      "Up to 10 users",
      "1,000 env variables",
      "100 secret files",
      "200 analyses / month",
      "20 active CI/CD tokens",
      "Audit logs (30 days)",
      "Secret scanning",
      "Env diff",
    ],
  },
  {
    name: "Team",
    key: SubscriptionPlanName.TEAM,
    price: "$10",
    description: "Per user / month",
    features: [
      "Everything in Pro, unlimited",
      "Unlimited users",
      "Audit logs (1 year)",
      "IP allowlists",
      "Priority support",
    ],
  },
];

export function PlanComparison(): ReactElement {
  const { plan: currentPlan } = useSubscription();
  const confirm = useConfirm();
  const [promoCode, setPromoCode] = useState("");
  const [checkoutTarget, setCheckoutTarget] = useState<SubscriptionPlanValue | null>(null);

  const checkoutMutation = useApiMutation<
    CheckoutSessionResponse,
    Pick<CreateCheckoutBody, "plan" | "promoCode">
  >(
    (variables) =>
      client.api.subscription.checkout.post({
        ...variables,
        successUrl: `${ROUTES.billing}?success=true`,
        cancelUrl: `${ROUTES.billing}?canceled=true`,
      }),
    {
      errorMessage: "Failed to start checkout",
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

  const handleUpgrade = (targetPlan: CreateCheckoutBody["plan"]) => {
    setCheckoutTarget(targetPlan as SubscriptionPlanValue);
    checkoutMutation.mutate({
      plan: targetPlan,
      ...(promoCode && { promoCode }),
    });
  };

  const handleDowngradeToFree = async () => {
    const confirmed = await confirm({
      title: "Downgrade to Free",
      description:
        "Your subscription will remain active until the end of the current billing period. After that, you'll be downgraded to the Free plan with reduced limits.",
      confirmLabel: "Downgrade",
      destructive: true,
    });
    if (confirmed) {
      cancelMutation.mutate();
    }
  };

  const currentOrder = PLAN_ORDER[currentPlan as SubscriptionPlanValue] ?? 0;

  const getButtonLabel = (planKey: SubscriptionPlanValue): string => {
    if (planKey === currentPlan) return "Current Plan";
    const targetOrder = PLAN_ORDER[planKey] ?? 0;
    return targetOrder > currentOrder ? "Upgrade" : "Downgrade";
  };

  return (
    <Box>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          mb: 3,
        }}
      >
        Plans
      </Typography>
      {currentPlan !== SubscriptionPlanName.TEAM && (
        <Box sx={{ mb: 3, maxWidth: 320 }}>
          <TextField
            label="Promo Code"
            size="small"
            fullWidth
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Enter promo code (optional)"
          />
        </Box>
      )}
      <Grid
        container
        spacing={3}
        sx={{
          alignItems: "stretch",
        }}
      >
        {PLANS.map((planDef) => {
          const isCurrent = planDef.key === currentPlan;

          return (
            <Grid key={planDef.key} size={{ xs: 12, md: 4 }}>
              <Card
                variant={isCurrent ? "elevation" : "outlined"}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  borderColor: isCurrent ? "primary.main" : undefined,
                  borderWidth: isCurrent ? 2 : undefined,
                }}
              >
                <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        alignItems: "center",
                        mb: 0.5,
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                        }}
                      >
                        {planDef.name}
                      </Typography>
                      {isCurrent && <StatusBadge label="Current" variant="info" />}
                    </Stack>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 800,
                      }}
                    >
                      {planDef.price}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "text.secondary",
                      }}
                    >
                      {planDef.description}
                    </Typography>
                  </Box>

                  <List dense disablePadding sx={{ flex: 1 }}>
                    {planDef.features.map((feature) => (
                      <ListItem key={feature} disableGutters sx={{ py: 0.25 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckIcon sx={{ fontSize: 18, color: "primary.main" }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={feature}
                          slotProps={{ primary: { variant: "body2" } }}
                        />
                      </ListItem>
                    ))}
                  </List>

                  {planDef.key === SubscriptionPlanName.FREE ? (
                    <Button
                      variant="outlined"
                      color="error"
                      fullWidth
                      disabled={
                        isCurrent ||
                        currentPlan === SubscriptionPlanName.FREE ||
                        cancelMutation.isPending
                      }
                      onClick={handleDowngradeToFree}
                    >
                      {cancelMutation.isPending
                        ? "Downgrading..."
                        : isCurrent
                          ? "Current Plan"
                          : "Downgrade"}
                    </Button>
                  ) : (
                    <Button
                      variant={isCurrent ? "outlined" : "contained"}
                      fullWidth
                      disabled={isCurrent || checkoutMutation.isPending}
                      onClick={() => handleUpgrade(planDef.key as CreateCheckoutBody["plan"])}
                    >
                      {checkoutMutation.isPending && checkoutTarget === planDef.key
                        ? "Loading..."
                        : getButtonLabel(planDef.key)}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
