import Stripe from "stripe";
import { singleton } from "tsyringe";
import { BadRequestError } from "@/common/errors";
import { logger } from "@/common/logger";
import { PrismaClient, type SubscriptionPlan } from "@/generated/prisma";
import { extractPeriodDates } from "./stripe-utils";
import type { CreateCheckoutBody } from "./subscription.schema";
import { SubscriptionService } from "./subscription.service";

/** Handles Stripe billing operations: checkout sessions, portal, cancel, and resume. */
@singleton()
export class StripeBillingService {
  private stripe: Stripe | null = null;
  private readonly frontendUrl = process.env.FRONTEND_URL!.replace(/\/$/, ""); // Ensure no trailing slash

  constructor(
    private readonly prisma: PrismaClient,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  getStripe(): Stripe {
    if (!this.stripe) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new BadRequestError("Stripe is not configured");
      }
      this.stripe = new Stripe(key);
    }
    return this.stripe;
  }

  async createCheckoutSession(userId: string, email: string, body: CreateCheckoutBody) {
    const successUrl = `${this.frontendUrl}${body.successUrl}`;
    const cancelUrl = `${this.frontendUrl}${body.cancelUrl}`;

    const stripe = this.getStripe();
    const subscription = await this.subscriptionService.getOrCreateSubscription(userId);

    const stripePlan = await this.prisma.stripePlan.findUnique({
      where: { plan: body.plan as SubscriptionPlan },
    });

    if (!stripePlan) {
      throw new BadRequestError(`Plan ${body.plan} is not available. Run stripe:seed first.`);
    }

    const customerId = await this.ensureStripeCustomer(
      userId,
      email,
      subscription.stripeCustomerId,
    );
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: stripePlan.priceId, quantity: body.quantity ?? 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: { metadata: { userId } },
    };

    if (body.promoCode) {
      const promotionCodes = await stripe.promotionCodes.list({
        code: body.promoCode,
        active: true,
        limit: 1,
      });

      if (promotionCodes.data.length === 0) {
        throw new BadRequestError("Invalid or expired promo code");
      }
      sessionParams.discounts = [{ promotion_code: promotionCodes.data[0]!.id }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    if (!session.url) {
      throw new BadRequestError("Failed to create checkout session");
    }

    logger.info({ userId, plan: body.plan }, "Checkout session created");
    return { url: session.url };
  }

  async createPortalSession(userId: string, returnPath: string) {
    const stripe = this.getStripe();
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });

    if (!subscription?.stripeCustomerId) {
      throw new BadRequestError("No billing account found");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${this.frontendUrl}${returnPath}`,
    });

    return { url: session.url };
  }

  async cancelSubscription(userId: string) {
    const stripe = this.getStripe();
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });

    if (!subscription?.stripeSubscriptionId) {
      throw new BadRequestError("No active subscription to cancel");
    }
    if (subscription.isComp) {
      throw new BadRequestError("Admin-granted subscriptions cannot be canceled this way");
    }

    const updated = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await this.prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: true,
        ...extractPeriodDates(updated),
      },
    });

    logger.info({ userId }, "Subscription scheduled for cancellation");
    return { message: "Subscription will cancel at the end of the current billing period" };
  }

  async resumeSubscription(userId: string) {
    const stripe = this.getStripe();
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });

    if (!subscription?.stripeSubscriptionId) {
      throw new BadRequestError("No subscription found");
    }
    if (!subscription.cancelAtPeriodEnd) {
      throw new BadRequestError("Subscription is not scheduled for cancellation");
    }

    const updated = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    await this.prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: false,
        ...extractPeriodDates(updated),
      },
    });

    logger.info({ userId }, "Subscription cancellation reversed");
    return { message: "Subscription cancellation reversed" };
  }

  private async ensureStripeCustomer(
    userId: string,
    email: string,
    existingCustomerId: string | null,
  ): Promise<string> {
    if (existingCustomerId) {
      return existingCustomerId;
    }

    const stripe = this.getStripe();
    const customer = await stripe.customers.create({ email, metadata: { userId } });

    await this.prisma.subscription.update({
      where: { userId },
      data: { stripeCustomerId: customer.id },
    });

    logger.info({ userId, customerId: customer.id }, "Stripe customer created");
    return customer.id;
  }
}
