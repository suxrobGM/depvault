import "reflect-metadata";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { ForbiddenError, NotFoundError } from "@/common/errors";
import * as encryption from "@/common/utils/encryption";
import { EnvironmentCloneService } from "./env-clone.service";

const now = new Date();
const projectId = "project-uuid";
const userId = "user-uuid";
const vaultGroupId = "vault-group-uuid";
const ipAddress = "127.0.0.1";
const sourceEnvId = "source-env-uuid";
const targetEnvId = "target-env-uuid";

const fakeProjectKey = Buffer.alloc(32, 1);

const mockEncrypted = {
  ciphertext: "new-encrypted",
  iv: "new-iv",
  authTag: "new-tag",
};

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
      create: mock(() => Promise.resolve(mockSourceVariable)),
    },
  } as any;
}

function createMockAuditLogService() {
  return {
    log: mock(() => Promise.resolve()),
  } as any;
}

describe("EnvironmentCloneService", () => {
  let service: EnvironmentCloneService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockAuditLog: ReturnType<typeof createMockAuditLogService>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockAuditLog = createMockAuditLogService();
    const { EnvironmentRepository } = require("./environment.repository");
    const envHelper = new EnvironmentRepository(mockPrisma);
    service = new EnvironmentCloneService(mockPrisma, mockAuditLog, envHelper);

    spyOn(encryption, "deriveProjectKey").mockReturnValue(fakeProjectKey);
    spyOn(encryption, "encrypt").mockReturnValue(mockEncrypted);
    spyOn(encryption, "decrypt").mockReturnValue("decrypted-value");
  });

  describe("cloneEnvironment", () => {
    const body = {
      vaultGroupId,
      sourceType: "DEVELOPMENT" as const,
      targetType: "STAGING" as const,
    };

    it("should clone all variables from source to target environment", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique
        .mockResolvedValueOnce(mockSourceEnv) // source lookup
        .mockResolvedValueOnce(null); // target lookup (doesn't exist yet)

      const result = await service.cloneEnvironment(projectId, body, userId, ipAddress);

      expect(result.id).toBe(targetEnvId);
      expect(result.type).toBe("STAGING");
      expect(result.variableCount).toBe(2);

      expect(encryption.decrypt).toHaveBeenCalledTimes(2);
      expect(encryption.encrypt).toHaveBeenCalledTimes(2);

      expect(mockPrisma.envVariable.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.envVariable.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          environmentId: targetEnvId,
          key: "DATABASE_URL",
          encryptedValue: "new-encrypted",
          iv: "new-iv",
          authTag: "new-tag",
          description: "The database URL",
          isRequired: true,
        }),
      });
      expect(mockPrisma.envVariable.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          environmentId: targetEnvId,
          key: "API_KEY",
          description: null,
          isRequired: false,
        }),
      });
    });

    it("should decrypt with source encryption and re-encrypt for target", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "EDITOR" });
      mockPrisma.environment.findUnique
        .mockResolvedValueOnce(mockSourceEnv)
        .mockResolvedValueOnce(null);

      await service.cloneEnvironment(projectId, body, userId, ipAddress);

      expect(encryption.deriveProjectKey).toHaveBeenCalledWith(projectId);
      expect(encryption.decrypt).toHaveBeenCalledWith(
        "old-encrypted",
        "old-iv",
        "old-tag",
        fakeProjectKey,
      );
      expect(encryption.encrypt).toHaveBeenCalledWith("decrypted-value", fakeProjectKey);
    });

    it("should use existing target environment if it already exists", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique
        .mockResolvedValueOnce(mockSourceEnv)
        .mockResolvedValueOnce(mockTargetEnv); // target already exists

      const result = await service.cloneEnvironment(projectId, body, userId, ipAddress);

      expect(result.id).toBe(targetEnvId);
      expect(mockPrisma.environment.create).not.toHaveBeenCalled();
    });

    it("should log audit entry with clone metadata", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique
        .mockResolvedValueOnce(mockSourceEnv)
        .mockResolvedValueOnce(null);

      await service.cloneEnvironment(projectId, body, userId, ipAddress);

      expect(mockAuditLog.log).toHaveBeenCalledWith({
        userId,
        projectId,
        action: "CLONE",
        resourceType: "ENV_VARIABLE",
        resourceId: targetEnvId,
        ipAddress,
        metadata: {
          source: "DEVELOPMENT",
          target: "STAGING",
          variableCount: 2,
        },
      });
    });

    it("should handle empty source environment with zero variables", async () => {
      const emptySourceEnv = { ...mockSourceEnv, variables: [] };
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique
        .mockResolvedValueOnce(emptySourceEnv)
        .mockResolvedValueOnce(null);

      const result = await service.cloneEnvironment(projectId, body, userId, ipAddress);

      expect(result.variableCount).toBe(0);
      expect(mockPrisma.envVariable.create).not.toHaveBeenCalled();
    });

    it("should throw NotFoundError if source environment does not exist", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(null);

      expect(service.cloneEnvironment(projectId, body, userId, ipAddress)).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should throw ForbiddenError for VIEWER role", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "VIEWER" });

      expect(service.cloneEnvironment(projectId, body, userId, ipAddress)).rejects.toThrow(
        ForbiddenError,
      );
    });

    it("should throw NotFoundError if user is not a project member", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(null);

      expect(service.cloneEnvironment(projectId, body, userId, ipAddress)).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
