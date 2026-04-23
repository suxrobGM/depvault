import "reflect-metadata";
import { INFINITE_LIMIT } from "@depvault/shared/constants";
import { describe, expect, it, mock } from "bun:test";
import { ForbiddenError } from "@/common/errors";
import { PlanEnforcementService } from "./plan-enforcement.service";

function createMockSubscriptionService(plan = "FREE", overrides: Record<string, any> = {}) {
  return {
    getUserPlan: mock(() =>
      Promise.resolve({
        plan,
        limits:
          plan === "FREE"
            ? {
                maxUsers: 1,
                maxProjects: 3,
                maxEnvVars: 100,
                maxSecretFiles: 10,
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
                maxEnvVars: INFINITE_LIMIT,
                maxSecretFiles: INFINITE_LIMIT,
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
    countDistinctEnvVars: mock(() => Promise.resolve(overrides.envVarCount ?? 0)),
    countDistinctSecretFiles: mock(() => Promise.resolve(overrides.secretFileCount ?? 0)),
    countAnalysesThisMonth: mock(() => Promise.resolve(overrides.analysisCount ?? 0)),
    countDistinctMembers: mock(() =>
      Promise.resolve(overrides.memberCount ?? (overrides.memberUserIds ?? []).length),
    ),
    countActiveCiTokens: mock(() => Promise.resolve(overrides.ciTokenCount ?? 0)),
  } as any;
}

function createMockPrisma() {
  return {
    project: {
      findUniqueOrThrow: mock(() => Promise.resolve({ ownerId: "owner-1" })),
    },
  } as any;
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

  describe("enforceEnvVarLimit", () => {
    it("should allow when under limit (100 for free)", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { envVarCount: 99 });
      const service = new PlanEnforcementService(prisma, subService);
      expect(service.enforceEnvVarLimit("owner-1")).resolves.toBeUndefined();
    });

    it("should throw when at limit", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { envVarCount: 100 });
      const service = new PlanEnforcementService(prisma, subService);
      expect(service.enforceEnvVarLimit("owner-1")).rejects.toThrow(
        "Environment variable limit reached (100/100)",
      );
    });

    it("should delegate counting to subscriptionService", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { envVarCount: 0 });
      const service = new PlanEnforcementService(prisma, subService);
      await service.enforceEnvVarLimit("owner-1");
      expect(subService.countDistinctEnvVars).toHaveBeenCalled();
      expect(subService.countDistinctSecretFiles).not.toHaveBeenCalled();
    });
  });

  describe("enforceSecretFileLimit", () => {
    it("should allow when under limit (10 for free)", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { secretFileCount: 9 });
      const service = new PlanEnforcementService(prisma, subService);
      expect(service.enforceSecretFileLimit("owner-1")).resolves.toBeUndefined();
    });

    it("should throw when at limit", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { secretFileCount: 10 });
      const service = new PlanEnforcementService(prisma, subService);
      expect(service.enforceSecretFileLimit("owner-1")).rejects.toThrow(
        "Secret file limit reached (10/10)",
      );
    });

    it("should delegate counting to subscriptionService", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { secretFileCount: 0 });
      const service = new PlanEnforcementService(prisma, subService);
      await service.enforceSecretFileLimit("owner-1");
      expect(subService.countDistinctSecretFiles).toHaveBeenCalled();
      expect(subService.countDistinctEnvVars).not.toHaveBeenCalled();
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

    it("should route envVar to enforceEnvVarLimit", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { envVarCount: 0 });
      const service = new PlanEnforcementService(prisma, subService);
      await service.enforceForProject("project-1", "envVar");
      expect(subService.countDistinctEnvVars).toHaveBeenCalled();
    });

    it("should route secretFile to enforceSecretFileLimit", async () => {
      const prisma = createMockPrisma();
      const subService = createMockSubscriptionService("FREE", { secretFileCount: 0 });
      const service = new PlanEnforcementService(prisma, subService);
      await service.enforceForProject("project-1", "secretFile");
      expect(subService.countDistinctSecretFiles).toHaveBeenCalled();
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
        envVarCount: 100,
        secretFileCount: 10,
        analysisCount: 30,
      });
      const service = new PlanEnforcementService(prisma, subService);
      expect(service.enforceEnvVarLimit("owner-1")).rejects.toBeInstanceOf(ForbiddenError);
      expect(service.enforceSecretFileLimit("owner-1")).rejects.toBeInstanceOf(ForbiddenError);
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
