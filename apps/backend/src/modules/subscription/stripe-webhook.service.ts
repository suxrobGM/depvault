import type Stripe from "stripe";
import { singleton } from "tsyringe";
import { BadRequestError } from "@/common/errors";
import { logger } from "@/common/logger";
import { PrismaClient, SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma";
import { StripeBillingService } from "./stripe-billing.service";

/** Handles Stripe webhook event verification, dispatching, and subscription sync. */
@singleton()
export class StripeWebhookService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly billing: StripeBillingService,
  ) {}

  async handleEvent(rawBody: string, signature: string): Promise<void> {
    const stripe = this.billing.getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new BadRequestError("Webhook secret not configured");
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
    } catch (err) {
      logger.error({ err: (err as Error).message }, "Stripe signature verification failed");
      throw new BadRequestError("Invalid Stripe webhook signature");
    }

    logger.info({ type: event.type, eventId: event.id }, "Stripe webhook received");
    await this.dispatch(event, stripe);
  }

  private async dispatch(event: Stripe.Event, stripe: Stripe): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed":
        return this.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session, stripe);
      case "customer.subscription.created":
      case "customer.subscription.updated":
        return this.syncSubscription(event.data.object as Stripe.Subscription);
      case "customer.subscription.deleted":
        return this.onSubscriptionDeleted(event.data.object as Stripe.Subscription);
      case "invoice.paid":
        return this.onInvoiceStatusChange(event.data.object, SubscriptionStatus.ACTIVE);
      case "invoice.payment_failed":
        return this.onInvoiceStatusChange(event.data.object, SubscriptionStatus.PAST_DUE);
      default:
        logger.debug({ type: event.type }, "Unhandled Stripe event type");
    }
  }

  private async onCheckoutCompleted(
    session: Stripe.Checkout.Session,
    stripe: Stripe,
  ): Promise<void> {
    if (!session.subscription || !session.metadata?.userId) {
      return;
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription as string);
    await this.syncSubscription(stripeSubscription);
    logger.info({ userId: session.metadata.userId }, "Checkout completed, subscription synced");
  }

  private async onSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
    const userId = sub.metadata?.userId;
    if (!userId) {
      return;
    }

    await this.prisma.subscription.update({
      where: { userId },
      data: {
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.CANCELED,
        stripeSubscriptionId: null,
        stripePriceId: null,
        canceledAt: new Date(),
      },
    });
    logger.info({ userId }, "Subscription deleted, reverted to FREE");
  }

  private async onInvoiceStatusChange(
    invoice: Stripe.Event.Data.Object,
    status: SubscriptionStatus,
  ): Promise<void> {
    const subscriptionId = (invoice as { subscription?: string }).subscription;
    if (!subscriptionId) {
      return;
    }

    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status },
    });
    logger.info({ subscriptionId, status }, "Invoice status updated subscription");
  }

  private async syncSubscription(stripeSubscription: Stripe.Subscription): Promise<void> {
    const userId = stripeSubscription.metadata?.userId;
    if (!userId) {
      logger.warn({ subscriptionId: stripeSubscription.id }, "No userId in subscription metadata");
      return;
    }

    const priceId = stripeSubscription.items.data[0]?.price?.id;
    const plan = await this.resolvePlanFromPriceId(priceId);
    const status = mapStripeStatus(stripeSubscription.status);

    const sub = stripeSubscription as Stripe.Subscription & {
      current_period_start?: number;
      current_period_end?: number;
    };
    const periodStart = sub.current_period_start ? new Date(sub.current_period_start * 1000) : null;
    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;

    await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        plan,
        status,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: priceId ?? null,
        quantity: stripeSubscription.items.data[0]?.quantity ?? 1,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        canceledAt: stripeSubscription.canceled_at
          ? new Date(stripeSubscription.canceled_at * 1000)
          : null,
      },
      create: {
        userId,
        plan,
        status,
        stripeCustomerId: stripeSubscription.customer as string,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: priceId ?? null,
        quantity: stripeSubscription.items.data[0]?.quantity ?? 1,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
    });

    logger.info({ userId, plan, status }, "Subscription synced from Stripe");
  }

  private async resolvePlanFromPriceId(priceId?: string): Promise<SubscriptionPlan> {
    if (!priceId) return SubscriptionPlan.FREE;

    const stripePlan = await this.prisma.stripePlan.findUnique({ where: { priceId } });
    return stripePlan?.plan ?? SubscriptionPlan.FREE;
  }
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  const mapping: Record<string, SubscriptionStatus> = {
    active: SubscriptionStatus.ACTIVE,
    past_due: SubscriptionStatus.PAST_DUE,
    canceled: SubscriptionStatus.CANCELED,
    trialing: SubscriptionStatus.TRIALING,
    incomplete: SubscriptionStatus.INCOMPLETE,
    incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
    unpaid: SubscriptionStatus.UNPAID,
    paused: SubscriptionStatus.PAUSED,
  };
  return mapping[status] ?? SubscriptionStatus.ACTIVE;
}
