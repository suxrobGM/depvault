import { singleton } from "tsyringe";
import { BadRequestError, NotFoundError } from "@/common/errors";
import { PrismaClient, SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma";
import { PLAN_PRICING } from "@/modules/subscription/plan-limits";
import { SubscriptionService } from "@/modules/subscription/subscription.service";
import type {
  AdminSubscriptionListQuery,
  AdminUserListQuery,
  CompSubscriptionBody,
} from "./admin.schema";

@singleton()
export class AdminService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async listUsers(query: AdminUserListQuery) {
    const { page, limit, search, plan } = query;

    const where: Record<string, unknown> = { deletedAt: null };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (plan) {
      where.subscription = { plan };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          subscription: {
            select: {
              plan: true,
              status: true,
              isComp: true,
              currentPeriodEnd: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        emailVerified: u.emailVerified,
        createdAt: u.createdAt,
        subscription: u.subscription ?? null,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) throw new NotFoundError("User not found");

    const usage = await this.subscriptionService.getUsage(userId);
    const ownedProjectCount = await this.prisma.project.count({ where: { ownerId: userId } });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      subscription: user.subscription
        ? {
            id: user.subscription.id,
            plan: user.subscription.plan,
            status: user.subscription.status,
            isComp: user.subscription.isComp,
            stripeCustomerId: user.subscription.stripeCustomerId,
            stripeSubscriptionId: user.subscription.stripeSubscriptionId,
            quantity: user.subscription.quantity,
            currentPeriodStart: user.subscription.currentPeriodStart,
            currentPeriodEnd: user.subscription.currentPeriodEnd,
            cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
          }
        : null,
      usage,
      ownedProjectCount,
    };
  }

  async assignCompSubscription(userId: string, body: CompSubscriptionBody) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("User not found");

    await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        plan: body.plan as SubscriptionPlan,
        status: SubscriptionStatus.ACTIVE,
        isComp: true,
      },
      create: {
        userId,
        plan: body.plan as SubscriptionPlan,
        status: SubscriptionStatus.ACTIVE,
        isComp: true,
      },
    });

    return { message: `${body.plan} plan granted to ${user.email}` };
  }

  async revokeCompSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!subscription) throw new NotFoundError("Subscription not found");
    if (!subscription.isComp) {
      throw new BadRequestError(
        "Subscription was not admin-granted and cannot be revoked this way",
      );
    }

    await this.prisma.subscription.update({
      where: { userId },
      data: {
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
        isComp: false,
      },
    });

    return { message: "Subscription reverted to FREE" };
  }

  async listSubscriptions(query: AdminSubscriptionListQuery) {
    const { page, limit, plan, status, isComp } = query;

    const where: Record<string, unknown> = {};
    if (plan) where.plan = plan;
    if (status) where.status = status;
    if (isComp !== undefined) where.isComp = isComp;

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      items: subscriptions.map((s) => ({
        id: s.id,
        userId: s.userId,
        plan: s.plan,
        status: s.status,
        isComp: s.isComp,
        quantity: s.quantity,
        currentPeriodEnd: s.currentPeriodEnd,
        createdAt: s.createdAt,
        user: s.user,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStats() {
    const [totalUsers, planCounts, statusCounts, isCompCount] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.subscription.groupBy({
        by: ["plan"],
        _count: { plan: true },
      }),
      this.prisma.subscription.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      this.prisma.subscription.count({ where: { isComp: true } }),
    ]);

    const planBreakdown = { free: 0, pro: 0, team: 0 };
    for (const row of planCounts) {
      const key = row.plan.toLowerCase() as keyof typeof planBreakdown;
      planBreakdown[key] = row._count.plan;
    }

    const activeSubscriptions = statusCounts.find((s) => s.status === "ACTIVE")?._count.status ?? 0;
    const canceledSubscriptions =
      statusCounts.find((s) => s.status === "CANCELED")?._count.status ?? 0;

    const paidSubscriptions = await this.prisma.subscription.findMany({
      where: {
        plan: { not: SubscriptionPlan.FREE },
        status: SubscriptionStatus.ACTIVE,
        isComp: false,
      },
      select: { plan: true, quantity: true },
    });

    const mrr = paidSubscriptions.reduce(
      (sum, s) => sum + (PLAN_PRICING[s.plan] / 100) * s.quantity,
      0,
    );

    return {
      totalUsers,
      planBreakdown,
      activeSubscriptions,
      canceledSubscriptions,
      isCompCount,
      mrr,
    };
  }
}
