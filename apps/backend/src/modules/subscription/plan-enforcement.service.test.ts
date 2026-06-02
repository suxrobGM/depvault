import "reflect-metadata";
import { INFINITE_LIMIT } from "@depvault/shared/constants";
import { describe, expect, it, mock } from "bun:test";
import { ForbiddenError } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma";
import { PlanEnforcementService } from "./plan-enforcement.service";
import { SubscriptionService } from "./subscription.service";

interface UsageOverrides {
  projectCount?: number;
  repoFileCount?: number;
  analysisCount?: number;
  memberCount?: number;
  memberUserIds?: string[];
  ciTokenCount?: number;
}

function createMockSubscriptionService(plan = "FREE", overrides: UsageOverrides = {}) {
  return {
    getUserPlan: mock(() =>
      Promise.resolve({
        plan,
        limits:
          plan === "FREE"
            ? {
                maxUsers: 1,
                maxProjects: 3,
                maxRepoFiles: 100,
                maxAnalysesPerMonth: 30,
                maxCiTokens: 5,
                auditLogRetentionDays: 0,
                gitSecretScanning: false,
                ipAllowlists: false,
                secretSharing: true,
                prioritySupport: false,
              }
            : {
                maxUsers: INFINITE_LIMIT,
                maxProjects: INFINITE_LIMIT,
                maxRepoFiles: INFINITE_LIMIT,
                maxAnalysesPerMonth: INFINITE_LIMIT,
                maxCiTokens: INFINITE_LIMIT,
                auditLogRetentionDays: 365,
                gitSecretScanning: true,
                ipAllowlists: true,
                secretSharing: true,
                prioritySupport: true,
              },
      }),
    ),
    countProjects: mock(() => Promise.resolve(overrides.projectCount ?? 0)),
    countDistinctRepoFiles: mock(() => Promise.resolve(overrides.repoFileCount ?? 0)),
    countAnalysesThisMonth: mock(() => Promise.resolve(overrides.analysisCount ?? 0)),
    countDistinctMembers: mock(() =>
      Promise.resolve(overrides.memberCount ?? (overrides.memberUserIds ?? []).length),
    ),
    countActiveCiTokens: mock(() => Promise.resolve(overrides.ciTokenCount ?? 0)),
  } as unknown as SubscriptionService;
}

function createMockPrisma() {
  return {
    project: {
      findUniqueOrThrow: mock(() => Promise.resolve({ ownerId: "owner-1" })),
    },
  } as unknown as PrismaClient;
}

describe("PlanEnforcementService", () => {
  describe("enforceProjectLimit", () => {
    it("should allow when under limit", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { projectCount: 2 });
      const service = new PlanEnforcementService(prisma, subService);
      expect(service.enforceProjectLimit("owner-1")).resolves.toBeUndefined();
    });

    it("should throw when at limit", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { projectCount: 3 });
      const service = new PlanEnforcementService(prisma, subService);
      expect(service.enforceProjectLimit("owner-1")).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("should throw when over limit", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { projectCount: 5 });
      const service = new PlanEnforcementService(prisma, subService);
      expect(service.enforceProjectLimit("owner-1")).rejects.toThrow("Project limit reached (5/3)");
    });

    it("should skip check for TEAM plan (infinite limit)", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("TEAM", { projectCount: 999 });
      const service = new PlanEnforcementService(prisma, subService);
      expect(service.enforceProjectLimit("owner-1")).resolves.toBeUndefined();
      expect(subService.countProjects).not.toHaveBeenCalled();
    });
  });

  describe("enforceRepoFileLimit", () => {
    it("should allow when under limit (100 for free)", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { repoFileCount: 99 });
      const service = new PlanEnforcementService(prisma, subService);
      expect(service.enforceRepoFileLimit("owner-1")).resolves.toBeUndefined();
    });

    it("should throw when at limit", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { repoFileCount: 100 });
      const service = new PlanEnforcementService(prisma, subService);
      expect(service.enforceRepoFileLimit("owner-1")).rejects.toThrow(
        "File limit reached (100/100)",
      );
    });

    it("should delegate counting to subscriptionService", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { repoFileCount: 0 });
      const service = new PlanEnforcementService(prisma, subService);
      await service.enforceRepoFileLimit("owner-1");
      expect(subService.countDistinctRepoFiles).toHaveBeenCalled();
    });
  });

  describe("enforceAnalysisLimit", () => {
    it("should allow when under limit (30 for free)", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { analysisCount: 29 });
      const service = new PlanEnforcementService(prisma, subService);
      expect(service.enforceAnalysisLimit("owner-1")).resolves.toBeUndefined();
    });

    it("should throw when at limit", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { analysisCount: 30 });
      const service = new PlanEnforcementService(prisma, subService);
      expect(service.enforceAnalysisLimit("owner-1")).rejects.toThrow(
        "Monthly analysis limit reached (30/30)",
      );
    });

    it("should delegate counting to subscriptionService", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { analysisCount: 0 });
      const service = new PlanEnforcementService(prisma, subService);
      await service.enforceAnalysisLimit("owner-1");
      expect(subService.countAnalysesThisMonth).toHaveBeenCalled();
    });
  });

  describe("enforceMemberLimit", () => {
    it("should allow when no members exist yet", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { memberCount: 0 });
      const service = new PlanEnforcementService(prisma, subService);
      expect(service.enforceMemberLimit("owner-1")).resolves.toBeUndefined();
    });

    it("should throw when owner is the sole member on free plan (maxUsers=1, count=1)", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { memberCount: 1 });
      const service = new PlanEnforcementService(prisma, subService);
      expect(service.enforceMemberLimit("owner-1")).rejects.toThrow("Member limit reached (1/1)");
    });

    it("should throw when two distinct members exist on free plan", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { memberCount: 2 });
      const service = new PlanEnforcementService(prisma, subService);
      expect(service.enforceMemberLimit("owner-1")).rejects.toThrow("Member limit reached (2/1)");
    });

    it("should delegate counting to subscriptionService", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { memberCount: 0 });
      const service = new PlanEnforcementService(prisma, subService);
      await service.enforceMemberLimit("owner-1");
      expect(subService.countDistinctMembers).toHaveBeenCalled();
    });

    it("should skip check for TEAM plan (infinite limit)", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("TEAM", { memberCount: 5 });
      const service = new PlanEnforcementService(prisma, subService);
      expect(service.enforceMemberLimit("owner-1")).resolves.toBeUndefined();
      expect(subService.countDistinctMembers).not.toHaveBeenCalled();
    });
  });

  describe("enforceCiTokenLimit", () => {
    it("should allow when under limit", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { ciTokenCount: 4 });
      const service = new PlanEnforcementService(prisma, subService);
      expect(service.enforceCiTokenLimit("owner-1")).resolves.toBeUndefined();
    });

    it("should throw when active tokens reach limit (5 for free)", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { ciTokenCount: 5 });
      const service = new PlanEnforcementService(prisma, subService);
      expect(service.enforceCiTokenLimit("owner-1")).rejects.toThrow(
        "CI/CD token limit reached (5/5)",
      );
    });

    it("should delegate counting to subscriptionService", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { ciTokenCount: 0 });
      const service = new PlanEnforcementService(prisma, subService);
      await service.enforceCiTokenLimit("owner-1");
      expect(subService.countActiveCiTokens).toHaveBeenCalled();
    });
  });

  describe("enforceFeatureAccess", () => {
    it("should allow enabled features", async () => {
      const service = new PlanEnforcementService(
        createMockPrisma(),
        createMockSubscriptionService(),
      );
      expect(service.enforceFeatureAccess("owner-1", "secretSharing")).resolves.toBeUndefined();
    });

    it("should throw for disabled features on free plan", async () => {
      const service = new PlanEnforcementService(
        createMockPrisma(),
        createMockSubscriptionService(),
      );
      expect(service.enforceFeatureAccess("owner-1", "gitSecretScanning")).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it("should allow all features on team plan", async () => {
      const service = new PlanEnforcementService(
        createMockPrisma(),
        createMockSubscriptionService("TEAM"),
      );
      expect(service.enforceFeatureAccess("owner-1", "gitSecretScanning")).resolves.toBeUndefined();
      expect(service.enforceFeatureAccess("owner-1", "ipAllowlists")).resolves.toBeUndefined();
    });
  });

  describe("enforceForProject", () => {
    it("should resolve project owner before enforcing", async () => {
      const prisma = createMockPrisma();
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      await service.enforceForProject("project-1", "project");
      expect(prisma.project.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: "project-1" },
        select: { ownerId: true },
      });
    });

    it("should route repoFile to enforceRepoFileLimit", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { repoFileCount: 0 });
      const service = new PlanEnforcementService(prisma, subService);
      await service.enforceForProject("project-1", "repoFile");
      expect(subService.countDistinctRepoFiles).toHaveBeenCalled();
    });

    it("should route ciToken to enforceCiTokenLimit", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { ciTokenCount: 0 });
      const service = new PlanEnforcementService(prisma, subService);
      await service.enforceForProject("project-1", "ciToken");
      expect(subService.countActiveCiTokens).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should allow exactly at limit minus one", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { projectCount: 2 });
      const service = new PlanEnforcementService(prisma, subService);
      expect(service.enforceProjectLimit("owner-1")).resolves.toBeUndefined();
    });

    it("should throw at exactly the limit boundary", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", {
        repoFileCount: 100,
        analysisCount: 30,
      });
      const service = new PlanEnforcementService(prisma, subService);
      expect(service.enforceRepoFileLimit("owner-1")).rejects.toBeInstanceOf(ForbiddenError);
      expect(service.enforceAnalysisLimit("owner-1")).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("should include count and limit in error message", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { projectCount: 5 });
      const service = new PlanEnforcementService(prisma, subService);
      try {
        await service.enforceProjectLimit("owner-1");
        expect(true).toBe(false);
      } catch (e) {
        expect((e as Error).message).toContain("5/3");
      }
    });
  });
});
