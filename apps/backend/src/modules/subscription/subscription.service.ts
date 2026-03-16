import Stripe from "stripe";
import { singleton } from "tsyringe";
import { BadRequestError, NotFoundError } from "@/common/errors";
import { logger } from "@/common/logger";
import { PrismaClient, SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma";
import { getPlanLimits, PLAN_LIMITS, PLAN_PRICING } from "./plan-limits";
import type { CreateCheckoutBody, SubscriptionResponse } from "./subscription.schema";

@singleton()
export class SubscriptionService {
  private stripe: Stripe | null = null;

  constructor(private readonly prisma: PrismaClient) {}

  private getStripe(): Stripe {
    if (!this.stripe) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) throw new BadRequestError("Stripe is not configured");
      this.stripe = new Stripe(key);
    }
    return this.stripe;
  }

  async getOrCreateSubscription(userId: string) {
    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (existing) return existing;

    return this.prisma.subscription.create({
      data: { userId, plan: SubscriptionPlan.FREE, status: SubscriptionStatus.ACTIVE },
    });
  }

  async getUserPlan(userId: string) {
    const subscription = await this.getOrCreateSubscription(userId);
    return { plan: subscription.plan, limits: getPlanLimits(subscription.plan) };
  }

  async getUsage(userId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const ownedProjectFilter = { project: { ownerId: userId } };

    const [projects, envVars, secretFiles, analyses, distinctMembers, ciTokens] = await Promise.all(
      [
        this.prisma.project.count({ where: { ownerId: userId } }),
        this.prisma.envVariable.count({
          where: { environment: ownedProjectFilter },
        }),
        this.prisma.secretFile.count({
          where: { environment: ownedProjectFilter },
        }),
        this.prisma.analysis.count({
          where: { ...ownedProjectFilter, createdAt: { gte: startOfMonth } },
        }),
        this.prisma.projectMember.findMany({
          where: ownedProjectFilter,
          distinct: ["userId"],
          select: { userId: true },
        }),
        this.prisma.ciToken.count({
          where: { ...ownedProjectFilter, revokedAt: null },
        }),
      ],
    );

    return {
      projects,
      envVars,
      secretFiles,
      analyses,
      members: distinctMembers.length,
      ciTokens,
    };
  }

  async getSubscriptionResponse(userId: string): Promise<SubscriptionResponse> {
    const subscription = await this.getOrCreateSubscription(userId);
    const limits = getPlanLimits(subscription.plan);
    const usage = await this.getUsage(userId);

    return {
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      stripeCustomerId: subscription.stripeCustomerId,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      quantity: subscription.quantity,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      isComp: subscription.isComp,
      limits,
      usage,
    };
  }

  async getPlans() {
    return Object.entries(PLAN_LIMITS).map(([plan, limits]) => ({
      name: plan.charAt(0) + plan.slice(1).toLowerCase(),
      plan,
      pricePerUser: PLAN_PRICING[plan as SubscriptionPlan] / 100,
      limits,
    }));
  }

  async createCheckoutSession(userId: string, email: string, body: CreateCheckoutBody) {
    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:4001";
    if (!body.successUrl.startsWith(frontendUrl) || !body.cancelUrl.startsWith(frontendUrl)) {
      throw new BadRequestError("Redirect URLs must belong to the application domain");
    }

    const stripe = this.getStripe();
    const subscription = await this.getOrCreateSubscription(userId);

    const stripePlan = await this.prisma.stripePlan.findUnique({
      where: { plan: body.plan as SubscriptionPlan },
    });

    if (!stripePlan) {
      throw new BadRequestError(`Plan ${body.plan} is not available. Run stripe:seed first.`);
    }

    let customerId = subscription.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { userId },
      });
      customerId = customer.id;

      await this.prisma.subscription.update({
        where: { userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: stripePlan.priceId,
          quantity: body.quantity ?? 1,
        },
      ],
      success_url: body.successUrl,
      cancel_url: body.cancelUrl,
      subscription_data: {
        metadata: { userId },
      },
    };

    if (body.promoCode) {
      const promotionCodes = await stripe.promotionCodes.list({
        code: body.promoCode,
        active: true,
        limit: 1,
      });

      if (promotionCodes.data.length > 0) {
        sessionParams.discounts = [{ promotion_code: promotionCodes.data[0]!.id }];
      } else {
        throw new BadRequestError("Invalid or expired promo code");
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      throw new BadRequestError("Failed to create checkout session");
    }

    return { url: session.url };
  }

  async createPortalSession(userId: string, returnUrl: string) {
    const stripe = this.getStripe();
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new BadRequestError("No billing account found");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  async handleWebhookEvent(rawBody: string, signature: string) {
    const stripe = this.getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new BadRequestError("Webhook secret not configured");
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestError("Invalid Stripe webhook signature");
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && session.metadata?.userId) {
          const stripeSubscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
          );
          await this.syncSubscription(stripeSubscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const stripeSubscription = event.data.object as Stripe.Subscription;
        await this.syncSubscription(stripeSubscription);
        break;
      }
      case "customer.subscription.deleted": {
        const stripeSubscription = event.data.object as Stripe.Subscription;
        const userId = stripeSubscription.metadata?.userId;
        if (userId) {
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
          logger.info({ userId }, "Subscription canceled, reverted to FREE");
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
        if (invoice.subscription) {
          await this.prisma.subscription.updateMany({
            where: { stripeSubscriptionId: invoice.subscription },
            data: { status: SubscriptionStatus.ACTIVE },
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
        if (invoice.subscription) {
          await this.prisma.subscription.updateMany({
            where: { stripeSubscriptionId: invoice.subscription },
            data: { status: SubscriptionStatus.PAST_DUE },
          });
        }
        break;
      }
      default:
        logger.debug({ type: event.type }, "Unhandled Stripe event type");
    }
  }

  private async syncSubscription(stripeSubscription: Stripe.Subscription) {
    const userId = stripeSubscription.metadata?.userId;
    if (!userId) {
      logger.warn({ subscriptionId: stripeSubscription.id }, "No userId in subscription metadata");
      return;
    }

    const priceId = stripeSubscription.items.data[0]?.price?.id;
    const plan = await this.resolvePlanFromPriceId(priceId);
    const status = this.mapStripeStatus(stripeSubscription.status);

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

    const stripePlan = await this.prisma.stripePlan.findUnique({
      where: { priceId },
    });

    return stripePlan?.plan ?? SubscriptionPlan.FREE;
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
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
}
