import { INFINITE_LIMIT } from "@depvault/shared/constants";
import { singleton } from "tsyringe";
import { ForbiddenError } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma";
import { type PlanLimits } from "./plan-limits";
import { SubscriptionService } from "./subscription.service";

type BooleanFeature = keyof {
  [K in keyof PlanLimits as PlanLimits[K] extends boolean ? K : never]: PlanLimits[K];
};

type LimitType = "project" | "envVar" | "secretFile" | "analysis" | "ciToken" | "member";

@singleton()
export class PlanEnforcementService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async enforceProjectLimit(userId: string): Promise<void> {
    const { limits } = await this.subscriptionService.getUserPlan(userId);
    if (limits.maxProjects === INFINITE_LIMIT) return;

    const count = await this.subscriptionService.countProjects(userId);
    if (count >= limits.maxProjects) {
      throw new ForbiddenError(
        `Project limit reached (${count}/${limits.maxProjects}). Upgrade your plan to create more projects.`,
      );
    }
  }

  async enforceEnvVarLimit(userId: string): Promise<void> {
    const { limits } = await this.subscriptionService.getUserPlan(userId);
    if (limits.maxEnvVars === INFINITE_LIMIT) return;

    const count = await this.subscriptionService.countDistinctEnvVars(userId);
    if (count >= limits.maxEnvVars) {
      throw new ForbiddenError(
        `Environment variable limit reached (${count}/${limits.maxEnvVars}). Upgrade your plan to store more variables.`,
      );
    }
  }

  async enforceSecretFileLimit(userId: string): Promise<void> {
    const { limits } = await this.subscriptionService.getUserPlan(userId);
    if (limits.maxSecretFiles === INFINITE_LIMIT) return;

    const count = await this.subscriptionService.countDistinctSecretFiles(userId);
    if (count >= limits.maxSecretFiles) {
      throw new ForbiddenError(
        `Secret file limit reached (${count}/${limits.maxSecretFiles}). Upgrade your plan to store more secret files.`,
      );
    }
  }

  async enforceAnalysisLimit(userId: string): Promise<void> {
    const { limits } = await this.subscriptionService.getUserPlan(userId);
    if (limits.maxAnalysesPerMonth === INFINITE_LIMIT) return;

    const count = await this.subscriptionService.countAnalysesThisMonth(userId);
    if (count >= limits.maxAnalysesPerMonth) {
      throw new ForbiddenError(
        `Monthly analysis limit reached (${count}/${limits.maxAnalysesPerMonth}). Upgrade your plan for more analyses.`,
      );
    }
  }

  async enforceMemberLimit(userId: string): Promise<void> {
    const { limits } = await this.subscriptionService.getUserPlan(userId);
    if (limits.maxUsers === INFINITE_LIMIT) return;

    const count = await this.subscriptionService.countDistinctMembers(userId);
    if (count >= limits.maxUsers) {
      throw new ForbiddenError(
        `Member limit reached (${count}/${limits.maxUsers}). Upgrade your plan to add more team members.`,
      );
    }
  }

  async enforceCiTokenLimit(userId: string): Promise<void> {
    const { limits } = await this.subscriptionService.getUserPlan(userId);
    if (limits.maxCiTokens === INFINITE_LIMIT) return;

    const count = await this.subscriptionService.countActiveCiTokens(userId);
    if (count >= limits.maxCiTokens) {
      throw new ForbiddenError(
        `CI/CD token limit reached (${count}/${limits.maxCiTokens}). Upgrade your plan for more tokens.`,
      );
    }
  }

  async enforceFeatureAccess(userId: string, feature: BooleanFeature): Promise<void> {
    const { limits } = await this.subscriptionService.getUserPlan(userId);
    if (!limits[feature]) {
      throw new ForbiddenError(
        `${feature} is not available on your current plan. Upgrade to access this feature.`,
      );
    }
  }

  /** Resolves the project owner and enforces the appropriate limit */
  async enforceForProject(projectId: string, limitType: LimitType): Promise<void> {
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { ownerId: true },
    });

    switch (limitType) {
      case "project":
        return this.enforceProjectLimit(project.ownerId);
      case "envVar":
        return this.enforceEnvVarLimit(project.ownerId);
      case "secretFile":
        return this.enforceSecretFileLimit(project.ownerId);
      case "analysis":
        return this.enforceAnalysisLimit(project.ownerId);
      case "ciToken":
        return this.enforceCiTokenLimit(project.ownerId);
      case "member":
        return this.enforceMemberLimit(project.ownerId);
    }
  }

  /** Resolves the project owner and enforces feature access */
  async enforceFeatureForProject(projectId: string, feature: BooleanFeature): Promise<void> {
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { ownerId: true },
    });
    return this.enforceFeatureAccess(project.ownerId, feature);
  }
}
