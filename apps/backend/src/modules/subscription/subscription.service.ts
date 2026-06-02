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

  async countProjects(userId: string): Promise<number> {
    return this.prisma.project.count({ where: { ownerId: userId } });
  }

  /** Count repo files (config + secret) across all owned projects. */
  async countDistinctRepoFiles(userId: string): Promise<number> {
    return this.prisma.repoFile.count({
      where: { project: { ownerId: userId } },
    });
  }

  async countAnalysesThisMonth(userId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return this.prisma.analysis.count({
      where: { project: { ownerId: userId }, createdAt: { gte: startOfMonth } },
    });
  }

  async countDistinctMembers(userId: string): Promise<number> {
    const rows = await this.prisma.projectMember.findMany({
      where: { project: { ownerId: userId } },
      distinct: ["userId"],
      select: { userId: true },
    });
    return rows.length;
  }

  async countActiveCiTokens(userId: string): Promise<number> {
    return this.prisma.ciToken.count({
      where: { project: { ownerId: userId }, revokedAt: null },
    });
  }

  async getUsage(userId: string) {
    const [projects, repoFiles, analyses, members, ciTokens] = await Promise.all([
      this.countProjects(userId),
      this.countDistinctRepoFiles(userId),
      this.countAnalysesThisMonth(userId),
      this.countDistinctMembers(userId),
      this.countActiveCiTokens(userId),
    ]);

    return { projects, repoFiles, analyses, members, ciTokens };
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
