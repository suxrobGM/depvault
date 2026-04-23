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

  /** Count distinct env variable keys per vault across all owned projects. */
  async countDistinctEnvVars(userId: string): Promise<number> {
    const rows = await this.prisma.envVariable.findMany({
      where: { vault: { project: { ownerId: userId } } },
      select: { key: true, vaultId: true },
    });
    return new Set(rows.map((v) => `${v.vaultId}:${v.key}`)).size;
  }

  /** Count distinct secret file names per vault across all owned projects. */
  async countDistinctSecretFiles(userId: string): Promise<number> {
    const rows = await this.prisma.secretFile.findMany({
      where: { vault: { project: { ownerId: userId } } },
      select: { name: true, vaultId: true },
    });
    return new Set(rows.map((f) => `${f.vaultId}:${f.name}`)).size;
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
    const [projects, envVars, secretFiles, analyses, members, ciTokens] = await Promise.all([
      this.countProjects(userId),
      this.countDistinctEnvVars(userId),
      this.countDistinctSecretFiles(userId),
      this.countAnalysesThisMonth(userId),
      this.countDistinctMembers(userId),
      this.countActiveCiTokens(userId),
    ]);

    return { projects, envVars, secretFiles, analyses, members, ciTokens };
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
