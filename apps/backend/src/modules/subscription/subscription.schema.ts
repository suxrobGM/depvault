import { t, type Static } from "elysia";

export const CreateCheckoutBodySchema = t.Object({
  plan: t.Union([t.Literal("PRO"), t.Literal("TEAM")]),
  quantity: t.Optional(t.Integer({ minimum: 1, default: 1 })),
  promoCode: t.Optional(t.String()),
  successUrl: t.String(),
  cancelUrl: t.String(),
});

export const CreatePortalSessionBodySchema = t.Object({
  returnUrl: t.String(),
});

export const CheckoutSessionResponseSchema = t.Object({
  url: t.String(),
});

export const PortalSessionResponseSchema = t.Object({
  url: t.String(),
});

export const PlanLimitsSchema = t.Object({
  maxUsers: t.Number(),
  maxProjects: t.Number(),
  maxEnvVars: t.Number(),
  maxSecretFiles: t.Number(),
  maxAnalysesPerMonth: t.Number(),
  maxCiTokens: t.Number(),
  auditLogRetentionDays: t.Number(),
  gitSecretScanning: t.Boolean(),
  ipAllowlists: t.Boolean(),
  secretSharing: t.Boolean(),
  prioritySupport: t.Boolean(),
});

export const UsageSchema = t.Object({
  projects: t.Number(),
  envVars: t.Number(),
  secretFiles: t.Number(),
  analyses: t.Number(),
  members: t.Number(),
  ciTokens: t.Number(),
});

export const SubscriptionResponseSchema = t.Object({
  id: t.String(),
  plan: t.String(),
  status: t.String(),
  stripeCustomerId: t.Nullable(t.String()),
  stripeSubscriptionId: t.Nullable(t.String()),
  quantity: t.Number(),
  currentPeriodStart: t.Nullable(t.Date()),
  currentPeriodEnd: t.Nullable(t.Date()),
  cancelAtPeriodEnd: t.Boolean(),
  isComp: t.Boolean(),
  limits: PlanLimitsSchema,
  usage: UsageSchema,
});

export const PlanInfoSchema = t.Object({
  name: t.String(),
  plan: t.String(),
  pricePerUser: t.Number(),
  limits: PlanLimitsSchema,
});

export const PlansResponseSchema = t.Array(PlanInfoSchema);

export type CreateCheckoutBody = Static<typeof CreateCheckoutBodySchema>;
export type CreatePortalSessionBody = Static<typeof CreatePortalSessionBodySchema>;
export type SubscriptionResponse = Static<typeof SubscriptionResponseSchema>;
export type PlanInfo = Static<typeof PlanInfoSchema>;
