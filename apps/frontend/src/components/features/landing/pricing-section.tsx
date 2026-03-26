import type { ReactElement } from "react";
import { CheckCircleOutline as CheckIcon } from "@mui/icons-material";
import {
  Button,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { GlassCard, GradientText } from "@/components/ui/cards";
import { SectionContainer } from "@/components/ui/containers";
import { ROUTES } from "@/lib/constants";

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  badge?: string;
}

const TIERS: PricingTier[] = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "For individual developers getting started",
    features: [
      "3 projects",
      "100 env variables",
      "10 secret files",
      "30 analyses / month",
      "1 user",
      "Secret sharing links",
      "5 active CI/CD tokens",
      "CLI access",
    ],
    cta: "Get Started Free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$5",
    period: "/user/mo",
    description: "For developers and small teams shipping fast",
    features: [
      "20 projects",
      "1,000 env variables",
      "100 secret files",
      "200 analyses / month",
      "Up to 10 users",
      "20 active CI/CD tokens",
      "Audit logs (30 days)",
      "Git secret scanning",
      "Version history",
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
    badge: "Most popular",
  },
  {
    name: "Team",
    price: "$10",
    period: "/user/mo",
    description: "For organizations that need control and compliance",
    features: [
      "Everything in Pro, unlimited",
      "Unlimited users",
      "Audit logs (1 year)",
      "IP allowlists",
      "Priority support",
    ],
    cta: "Upgrade to Team",
    highlighted: false,
  },
];

export function PricingSection(): ReactElement {
  return (
    <SectionContainer>
      <Typography variant="h2" textAlign="center" sx={{ mb: 1 }}>
        Simple, transparent{" "}
        <GradientText variant="h2" component="span" animated>
          pricing
        </GradientText>
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        textAlign="center"
        sx={{ mb: 6, maxWidth: 500, mx: "auto", lineHeight: 1.7 }}
      >
        Free for individual developers. Scalable for teams of any size.
      </Typography>
      <Grid container spacing={3} justifyContent="center" alignItems="stretch">
        {TIERS.map((tier) => (
          <Grid key={tier.name} size={{ xs: 12, sm: 6, md: 4 }}>
            <GlassCard
              glowColor={tier.highlighted ? "#10b981" : undefined}
              sx={{
                height: "100%",
                p: 4,
                position: "relative",
                display: "flex",
                flexDirection: "column",
                ...(tier.highlighted && {
                  borderColor: "rgba(16, 185, 129, 0.3)",
                  boxShadow: "0 0 32px rgba(16, 185, 129, 0.12)",
                }),
              }}
            >
              {tier.badge && (
                <Chip
                  label={tier.badge}
                  color="primary"
                  size="small"
                  sx={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    fontWeight: 600,
                    fontSize: "0.7rem",
                    letterSpacing: "0.03em",
                  }}
                />
              )}
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                {tier.name}
              </Typography>
              <Stack direction="row" alignItems="baseline" spacing={0.5} sx={{ mb: 1 }}>
                <Typography variant="h3" sx={{ fontWeight: 800 }}>
                  {tier.price}
                </Typography>
                {tier.period && (
                  <Typography variant="body2" color="text.secondary">
                    {tier.period}
                  </Typography>
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
                {tier.description}
              </Typography>
              <List dense disablePadding sx={{ flex: 1, mb: 3 }}>
                {tier.features.map((feature) => (
                  <ListItem key={feature} disablePadding sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckIcon sx={{ fontSize: 18, color: "primary.main" }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={feature}
                      slotProps={{ primary: { variant: "body2", color: "text.secondary" } }}
                    />
                  </ListItem>
                ))}
              </List>
              <Link href={ROUTES.register} style={{ textDecoration: "none" }}>
                <Button
                  variant={tier.highlighted ? "contained" : "outlined"}
                  fullWidth
                  size="large"
                  sx={{ mt: "auto" }}
                >
                  {tier.cta}
                </Button>
              </Link>
            </GlassCard>
          </Grid>
        ))}
      </Grid>
    </SectionContainer>
  );
}
