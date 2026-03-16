import "reflect-metadata";
import { describe, expect, it, mock } from "bun:test";
import { ForbiddenError } from "@/common/errors";
import { PlanEnforcementService } from "./plan-enforcement.service";

function createMockSubscriptionService(plan = "FREE") {
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
                envDiff: false,
                prioritySupport: false,
              }
            : {
                maxUsers: Number.POSITIVE_INFINITY,
                maxProjects: Number.POSITIVE_INFINITY,
                maxEnvVars: Number.POSITIVE_INFINITY,
                maxSecretFiles: Number.POSITIVE_INFINITY,
                maxAnalysesPerMonth: Number.POSITIVE_INFINITY,
                maxCiTokens: Number.POSITIVE_INFINITY,
                auditLogRetentionDays: 365,
                gitSecretScanning: true,
                ipAllowlists: true,
                secretSharing: true,
                envDiff: true,
                prioritySupport: true,
              },
      }),
    ),
  } as any;
}

function createMockPrisma(overrides: Record<string, any> = {}) {
  return {
    project: {
      count: mock(() => Promise.resolve(overrides.projectCount ?? 0)),
      findUniqueOrThrow: mock(() => Promise.resolve({ ownerId: "owner-1" })),
    },
    envVariable: {
      count: mock(() => Promise.resolve(overrides.envVarCount ?? 0)),
    },
    secretFile: {
      count: mock(() => Promise.resolve(overrides.secretFileCount ?? 0)),
    },
    analysis: {
      count: mock(() => Promise.resolve(overrides.analysisCount ?? 0)),
    },
    projectMember: {
      findMany: mock(() =>
        Promise.resolve(
          (overrides.memberUserIds ?? ["owner-1"]).map((id: string) => ({ userId: id })),
        ),
      ),
    },
    ciToken: {
      count: mock(() => Promise.resolve(overrides.ciTokenCount ?? 0)),
    },
  } as any;
}

describe("PlanEnforcementService", () => {
  describe("enforceProjectLimit", () => {
    it("should allow when under limit", async () => {
      const prisma = createMockPrisma({ projectCount: 2 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      expect(service.enforceProjectLimit("owner-1")).resolves.toBeUndefined();
    });

    it("should throw when at limit", async () => {
      const prisma = createMockPrisma({ projectCount: 3 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      expect(service.enforceProjectLimit("owner-1")).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("should throw when over limit", async () => {
      const prisma = createMockPrisma({ projectCount: 5 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      expect(service.enforceProjectLimit("owner-1")).rejects.toThrow("Project limit reached (5/3)");
    });

    it("should skip check for TEAM plan (infinite limit)", async () => {
      const prisma = createMockPrisma({ projectCount: 999 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService("TEAM"));
      expect(service.enforceProjectLimit("owner-1")).resolves.toBeUndefined();
      expect(prisma.project.count).not.toHaveBeenCalled();
    });
  });

  describe("enforceEnvVarLimit", () => {
    it("should allow when under limit (100 for free)", async () => {
      const prisma = createMockPrisma({ envVarCount: 99 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      expect(service.enforceEnvVarLimit("owner-1")).resolves.toBeUndefined();
    });

    it("should throw when at limit", async () => {
      const prisma = createMockPrisma({ envVarCount: 100 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      expect(service.enforceEnvVarLimit("owner-1")).rejects.toThrow(
        "Environment variable limit reached (100/100)",
      );
    });

    it("should query envVariable table not secretFile", async () => {
      const prisma = createMockPrisma({ envVarCount: 0 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      await service.enforceEnvVarLimit("owner-1");
      expect(prisma.envVariable.count).toHaveBeenCalled();
      expect(prisma.secretFile.count).not.toHaveBeenCalled();
    });
  });

  describe("enforceSecretFileLimit", () => {
    it("should allow when under limit (10 for free)", async () => {
      const prisma = createMockPrisma({ secretFileCount: 9 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      expect(service.enforceSecretFileLimit("owner-1")).resolves.toBeUndefined();
    });

    it("should throw when at limit", async () => {
      const prisma = createMockPrisma({ secretFileCount: 10 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      expect(service.enforceSecretFileLimit("owner-1")).rejects.toThrow(
        "Secret file limit reached (10/10)",
      );
    });

    it("should query secretFile table not envVariable", async () => {
      const prisma = createMockPrisma({ secretFileCount: 0 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      await service.enforceSecretFileLimit("owner-1");
      expect(prisma.secretFile.count).toHaveBeenCalled();
      expect(prisma.envVariable.count).not.toHaveBeenCalled();
    });
  });

  describe("enforceAnalysisLimit", () => {
    it("should allow when under limit (30 for free)", async () => {
      const prisma = createMockPrisma({ analysisCount: 29 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      expect(service.enforceAnalysisLimit("owner-1")).resolves.toBeUndefined();
    });

    it("should throw when at limit", async () => {
      const prisma = createMockPrisma({ analysisCount: 30 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      expect(service.enforceAnalysisLimit("owner-1")).rejects.toThrow(
        "Monthly analysis limit reached (30/30)",
      );
    });

    it("should filter by current month", async () => {
      const prisma = createMockPrisma({ analysisCount: 0 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      await service.enforceAnalysisLimit("owner-1");

      const callArgs = prisma.analysis.count.mock.calls[0]![0];
      expect(callArgs.where.createdAt.gte).toBeInstanceOf(Date);
      expect(callArgs.where.createdAt.gte.getDate()).toBe(1);
    });
  });

  describe("enforceMemberLimit", () => {
    it("should allow when no members exist yet (empty projects)", async () => {
      const prisma = createMockPrisma({ memberUserIds: [] });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      expect(service.enforceMemberLimit("owner-1")).resolves.toBeUndefined();
    });

    it("should throw when owner is the sole member on free plan (maxUsers=1, count=1)", async () => {
      const prisma = createMockPrisma({ memberUserIds: ["owner-1"] });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      expect(service.enforceMemberLimit("owner-1")).rejects.toThrow("Member limit reached (1/1)");
    });

    it("should throw when two distinct members exist on free plan", async () => {
      const prisma = createMockPrisma({ memberUserIds: ["owner-1", "member-2"] });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      expect(service.enforceMemberLimit("owner-1")).rejects.toThrow("Member limit reached (2/1)");
    });

    it("should use distinct to deduplicate same user across multiple projects", async () => {
      const prisma = createMockPrisma();
      prisma.projectMember.findMany = mock(() => Promise.resolve([{ userId: "owner-1" }]));
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      await service.enforceMemberLimit("owner-1").catch(() => {});

      const callArgs = prisma.projectMember.findMany.mock.calls[0]![0];
      expect(callArgs.distinct).toEqual(["userId"]);
    });

    it("should skip check for TEAM plan (infinite limit)", async () => {
      const prisma = createMockPrisma({ memberUserIds: ["a", "b", "c", "d", "e"] });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService("TEAM"));
      expect(service.enforceMemberLimit("owner-1")).resolves.toBeUndefined();
      expect(prisma.projectMember.findMany).not.toHaveBeenCalled();
    });
  });

  describe("enforceCiTokenLimit", () => {
    it("should allow when under limit", async () => {
      const prisma = createMockPrisma({ ciTokenCount: 4 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      expect(service.enforceCiTokenLimit("owner-1")).resolves.toBeUndefined();
    });

    it("should throw when active tokens reach limit (5 for free)", async () => {
      const prisma = createMockPrisma({ ciTokenCount: 5 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      expect(service.enforceCiTokenLimit("owner-1")).rejects.toThrow(
        "CI/CD token limit reached (5/5)",
      );
    });

    it("should only count active tokens (revokedAt: null)", async () => {
      const prisma = createMockPrisma({ ciTokenCount: 0 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      await service.enforceCiTokenLimit("owner-1");

      const callArgs = prisma.ciToken.count.mock.calls[0]![0];
      expect(callArgs.where.revokedAt).toBeNull();
    });

    it("should count across all owned projects (total, not per project)", async () => {
      const prisma = createMockPrisma({ ciTokenCount: 0 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      await service.enforceCiTokenLimit("owner-1");

      const callArgs = prisma.ciToken.count.mock.calls[0]![0];
      expect(callArgs.where.project.ownerId).toBe("owner-1");
      expect(callArgs.where.projectId).toBeUndefined();
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
      expect(service.enforceFeatureAccess("owner-1", "envDiff")).resolves.toBeUndefined();
    });
  });

  describe("enforceForProject", () => {
    it("should resolve project owner before enforcing", async () => {
      const prisma = createMockPrisma({ projectCount: 0 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      await service.enforceForProject("project-1", "project");
      expect(prisma.project.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: "project-1" },
        select: { ownerId: true },
      });
    });

    it("should route envVar to enforceEnvVarLimit", async () => {
      const prisma = createMockPrisma({ envVarCount: 0 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      await service.enforceForProject("project-1", "envVar");
      expect(prisma.envVariable.count).toHaveBeenCalled();
    });

    it("should route secretFile to enforceSecretFileLimit", async () => {
      const prisma = createMockPrisma({ secretFileCount: 0 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      await service.enforceForProject("project-1", "secretFile");
      expect(prisma.secretFile.count).toHaveBeenCalled();
    });

    it("should route ciToken to total count (not per project)", async () => {
      const prisma = createMockPrisma({ ciTokenCount: 0 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      await service.enforceForProject("project-1", "ciToken");

      const callArgs = prisma.ciToken.count.mock.calls[0]![0];
      expect(callArgs.where.project.ownerId).toBe("owner-1");
      expect(callArgs.where.revokedAt).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("should allow exactly at limit minus one", async () => {
      const prisma = createMockPrisma({ projectCount: 2 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      expect(service.enforceProjectLimit("owner-1")).resolves.toBeUndefined();
    });

    it("should throw at exactly the limit boundary", async () => {
      const prisma = createMockPrisma({ envVarCount: 100, secretFileCount: 10, analysisCount: 30 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      expect(service.enforceEnvVarLimit("owner-1")).rejects.toBeInstanceOf(ForbiddenError);
      expect(service.enforceSecretFileLimit("owner-1")).rejects.toBeInstanceOf(ForbiddenError);
      expect(service.enforceAnalysisLimit("owner-1")).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("should include count and limit in error message", async () => {
      const prisma = createMockPrisma({ projectCount: 5 });
      const service = new PlanEnforcementService(prisma, createMockSubscriptionService());
      try {
        await service.enforceProjectLimit("owner-1");
        expect(true).toBe(false);
      } catch (e) {
        expect((e as Error).message).toContain("5/3");
      }
    });
  });
});
