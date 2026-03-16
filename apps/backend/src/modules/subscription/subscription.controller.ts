import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
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
    ({ body, user }) => subscriptionService.createCheckoutSession(user.id, user.email, body),
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
    ({ body, user }) => subscriptionService.createPortalSession(user.id, body.returnUrl),
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
  );
