"use client";

import { useState, type ReactElement } from "react";
import { CheckCircleOutline as CheckIcon } from "@mui/icons-material";
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
import { useSubscription } from "@/hooks/use-subscription";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { CheckoutSessionResponse, CreateCheckoutBody } from "@/types/api";

interface PlanDef {
  name: string;
  key: "FREE" | "PRO" | "TEAM";
  price: string;
  description: string;
  features: string[];
}

const PLANS: PlanDef[] = [
  {
    name: "Free",
    key: "FREE",
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
    key: "PRO",
    price: "$10",
    description: "Per user / month",
    features: [
      "20 projects",
      "Up to 10 users",
      "1,000 env variables",
      "100 secret files",
      "200 analyses / month",
      "50 active CI/CD tokens",
      "Audit logs (30 days)",
      "Secret scanning",
      "Env diff",
    ],
  },
  {
    name: "Team",
    key: "TEAM",
    price: "$15",
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
  const [promoCode, setPromoCode] = useState("");

  const checkoutMutation = useApiMutation<
    CheckoutSessionResponse,
    Pick<CreateCheckoutBody, "plan" | "promoCode">
  >(
    (variables) =>
      client.api.subscription.checkout.post({
        ...variables,
        successUrl: `${window.location.origin}${ROUTES.billing}?success=true`,
        cancelUrl: `${window.location.origin}${ROUTES.billing}`,
      }),
    {
      errorMessage: "Failed to start checkout",
      onSuccess: (data) => {
        window.location.href = data.url;
      },
    },
  );

  const handleUpgrade = (targetPlan: "PRO" | "TEAM") => {
    checkoutMutation.mutate({
      plan: targetPlan,
      ...(promoCode && { promoCode }),
    });
  };

  const getButtonLabel = (planKey: string): string => {
    if (planKey === currentPlan) {
      return "Current Plan";
    }
    const planOrder = { FREE: 0, PRO: 1, TEAM: 2 };
    const currentOrder = planOrder[currentPlan as keyof typeof planOrder] ?? 0;
    const targetOrder = planOrder[planKey as keyof typeof planOrder] ?? 0;
    return targetOrder > currentOrder ? "Upgrade" : "Downgrade";
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Plans
      </Typography>

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

      <Grid container spacing={3} alignItems="stretch">
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
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <Typography variant="h6" fontWeight={700}>
                        {planDef.name}
                      </Typography>
                      {isCurrent && <StatusBadge label="Current" variant="info" />}
                    </Stack>
                    <Typography variant="h4" fontWeight={800}>
                      {planDef.price}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
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

                  <Button
                    variant={isCurrent ? "outlined" : "contained"}
                    fullWidth
                    disabled={isCurrent || planDef.key === "FREE" || checkoutMutation.isPending}
                    onClick={() => handleUpgrade(planDef.key as "PRO" | "TEAM")}
                  >
                    {checkoutMutation.isPending ? "Loading..." : getButtonLabel(planDef.key)}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
