import "reflect-metadata";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { EnvironmentRepository } from "@/modules/environment";
import { EnvironmentSyncService } from "./env-sync.service";

const now = new Date();
const projectId = "project-uuid";
const userId = "user-uuid";
const vaultGroupId = "vault-group-uuid";
const ipAddress = "127.0.0.1";
const sourceEnvId = "source-env-uuid";
const targetEnvId = "target-env-uuid";

const mockSourceVariable = {
  id: "var-1",
  environmentId: sourceEnvId,
  key: "DATABASE_URL",
  encryptedValue: "old-encrypted",
  iv: "old-iv",
  authTag: "old-tag",
  description: "The database URL",
  isRequired: true,
  createdAt: now,
  updatedAt: now,
};

const mockSourceVariable2 = {
  id: "var-2",
  environmentId: sourceEnvId,
  key: "API_KEY",
  encryptedValue: "old-encrypted-2",
  iv: "old-iv-2",
  authTag: "old-tag-2",
  description: null,
  isRequired: false,
  createdAt: now,
  updatedAt: now,
};

const mockSourceEnv = {
  id: sourceEnvId,
  projectId,
  vaultGroupId,
  type: "DEVELOPMENT",
  variables: [mockSourceVariable, mockSourceVariable2],
  createdAt: now,
  updatedAt: now,
};

const mockTargetEnv = {
  id: targetEnvId,
  projectId,
  vaultGroupId,
  type: "STAGING",
  createdAt: now,
  updatedAt: now,
};

function createMockPrisma() {
  return {
    projectMember: {
      findUnique: mock(() => Promise.resolve(null)),
    },
    environment: {
      findUnique: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve(mockTargetEnv)),
    },
    envVariable: {
      upsert: mock(() => Promise.resolve(mockSourceVariable)),
    },
    vaultGroup: {
      findUnique: mock(() => Promise.resolve({ name: "Default" })),
    },
  } as any;
}

function createMockAuditLogService() {
  return {
    log: mock(() => Promise.resolve()),
  } as any;
}

describe("EnvironmentSyncService", () => {
  let service: EnvironmentSyncService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockAuditLog: ReturnType<typeof createMockAuditLogService>;

  beforeEach(() => {
    mock.restore();
    mockPrisma = createMockPrisma();
    mockAuditLog = createMockAuditLogService();
    const envHelper = new EnvironmentRepository(mockPrisma);
    service = new EnvironmentSyncService(mockPrisma, mockAuditLog, envHelper);
  });

  describe("syncEnvironment", () => {
    const entries = [
      {
        key: "DATABASE_URL",
        encryptedValue: "new-encrypted",
        iv: "new-iv",
        authTag: "new-tag",
        description: "The database URL",
        isRequired: true,
      },
      {
        key: "API_KEY",
        encryptedValue: "new-encrypted-2",
        iv: "new-iv-2",
        authTag: "new-tag-2",
        description: null,
        isRequired: false,
      },
    ];

    const body = {
      vaultGroupId,
      sourceEnvironmentType: "DEVELOPMENT" as const,
      targetEnvironmentType: "STAGING" as const,
      entries,
    };

    it("should sync all variables from source to target environment", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });

      const result = await service.syncEnvironment(projectId, body, userId, ipAddress);

      expect(result.id).toBe(targetEnvId);
      expect(result.type).toBe("STAGING");
      expect(result.variableCount).toBe(2);

      expect(mockPrisma.envVariable.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.envVariable.upsert).toHaveBeenCalledWith({
        where: {
          environmentId_key: { environmentId: targetEnvId, key: "DATABASE_URL" },
        },
        create: expect.objectContaining({
          environmentId: targetEnvId,
          key: "DATABASE_URL",
          encryptedValue: "new-encrypted",
          iv: "new-iv",
          authTag: "new-tag",
          description: "The database URL",
          isRequired: true,
        }),
        update: expect.objectContaining({
          encryptedValue: "new-encrypted",
          iv: "new-iv",
          authTag: "new-tag",
          description: "The database URL",
          isRequired: true,
        }),
      });
    });

    it("should upsert entries directly without decrypt/encrypt", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "EDITOR" });

      await service.syncEnvironment(projectId, body, userId, ipAddress);

      expect(mockPrisma.envVariable.upsert).toHaveBeenCalledTimes(2);
    });

    it("should use existing target environment if it already exists", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(mockTargetEnv);

      const result = await service.syncEnvironment(projectId, body, userId, ipAddress);

      expect(result.id).toBe(targetEnvId);
    });

    it("should upsert variables when target already has matching keys", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(mockTargetEnv);

      await service.syncEnvironment(projectId, body, userId, ipAddress);

      expect(mockPrisma.envVariable.upsert).toHaveBeenCalledTimes(2);
      for (const call of mockPrisma.envVariable.upsert.mock.calls) {
        const arg = call[0];
        expect(arg.where.environmentId_key.environmentId).toBe(targetEnvId);
        expect(arg.create.environmentId).toBe(targetEnvId);
      }
    });

    it("should log audit entry with sync metadata", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });

      await service.syncEnvironment(projectId, body, userId, ipAddress);

      expect(mockAuditLog.log).toHaveBeenCalledWith({
        userId,
        projectId,
        action: "SYNC",
        resourceType: "ENV_VARIABLE",
        resourceId: targetEnvId,
        ipAddress,
        metadata: {
          source: "DEVELOPMENT",
          target: "STAGING",
          variableCount: 2,
          vaultGroupName: "Default",
        },
      });
    });

    it("should handle empty entries array with zero variables", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });

      const emptyBody = { ...body, entries: [] as typeof entries };
      const result = await service.syncEnvironment(projectId, emptyBody, userId, ipAddress);

      expect(result.variableCount).toBe(0);
      expect(mockPrisma.envVariable.upsert).not.toHaveBeenCalled();
    });

    it("should use 'Unknown' vault group name when vault group does not exist", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.vaultGroup.findUnique.mockResolvedValueOnce(null);

      const result = await service.syncEnvironment(projectId, body, userId, ipAddress);

      expect(result.variableCount).toBe(2);
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ vaultGroupName: "Unknown" }),
        }),
      );
    });
  });
});
