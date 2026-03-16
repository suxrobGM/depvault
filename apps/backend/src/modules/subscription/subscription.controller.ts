import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import { MessageResponseSchema } from "@/types/response";
import { StripeBillingService } from "./stripe-billing.service";
import {
  CheckoutSessionResponseSchema,
  CreateCheckoutBodySchema,
  CreatePortalSessionBodySchema,
  PlansResponseSchema,
  PortalSessionResponseSchema,
  SubscriptionResponseSchema,
} from "./subscription.schema";
import { SubscriptionService } from "./subscription.service";

const subscriptionService = container.resolve(SubscriptionService);
const billingService = container.resolve(StripeBillingService);

export const subscriptionController = new Elysia({
  prefix: "/subscription",
  detail: { tags: ["Subscription"] },
})
  .use(authGuard)
  .get("/", ({ user }) => subscriptionService.getSubscriptionResponse(user.id), {
    response: SubscriptionResponseSchema,
    detail: {
      operationId: "getSubscription",
      summary: "Get current subscription",
      description:
        "Return the authenticated user's subscription details including plan, limits, and current usage.",
      security: [{ bearerAuth: [] }],
    },
  })
  .get("/plans", () => subscriptionService.getPlans(), {
    response: PlansResponseSchema,
    detail: {
      operationId: "getPlans",
      summary: "Get available plans",
      description: "Return all available subscription plans with pricing and limits.",
      security: [{ bearerAuth: [] }],
    },
  })
  .post(
    "/checkout",
    ({ body, user }) => billingService.createCheckoutSession(user.id, user.email, body),
    {
      body: CreateCheckoutBodySchema,
      response: CheckoutSessionResponseSchema,
      detail: {
        operationId: "createCheckoutSession",
        summary: "Create Stripe checkout session",
        description:
          "Create a Stripe Checkout session for upgrading to a paid plan. Returns a URL to redirect the user to Stripe.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/portal",
    ({ body, user }) => billingService.createPortalSession(user.id, body.returnUrl),
    {
      body: CreatePortalSessionBodySchema,
      response: PortalSessionResponseSchema,
      detail: {
        operationId: "createPortalSession",
        summary: "Create Stripe customer portal session",
        description:
          "Create a Stripe Customer Portal session for managing billing, invoices, and subscription changes.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post("/cancel", ({ user }) => billingService.cancelSubscription(user.id), {
    response: MessageResponseSchema,
    detail: {
      operationId: "cancelSubscription",
      summary: "Cancel subscription",
      description:
        "Schedule the current subscription to cancel at the end of the billing period. Access continues until then.",
      security: [{ bearerAuth: [] }],
    },
  })
  .post("/resume", ({ user }) => billingService.resumeSubscription(user.id), {
    response: MessageResponseSchema,
    detail: {
      operationId: "resumeSubscription",
      summary: "Resume canceled subscription",
      description: "Reverse a pending cancellation so the subscription renews normally.",
      security: [{ bearerAuth: [] }],
    },
  });
