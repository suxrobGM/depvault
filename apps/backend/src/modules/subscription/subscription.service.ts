import { singleton } from "tsyringe";
import { logger } from "@/common/logger";
import { PrismaClient, SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma";
import { getPlanLimits, PLAN_LIMITS, PLAN_PRICING } from "./plan-limits";
import type { SubscriptionResponse } from "./subscription.schema";

/** Manages subscription state, plan queries, and usage tracking. */
@singleton()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaClient) {}

  async getOrCreateSubscription(userId: string) {
    const existing = await this.prisma.subscription.findUnique({ where: { userId } });
    if (existing) {
      return existing;
    }

    logger.info({ userId }, "Creating FREE subscription for new user");
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
        this.prisma.envVariable.count({ where: { environment: ownedProjectFilter } }),
        this.prisma.secretFile.count({ where: { environment: ownedProjectFilter } }),
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
}
