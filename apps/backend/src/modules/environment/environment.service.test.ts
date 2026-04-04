import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { ForbiddenError, NotFoundError } from "@/common/errors";
import { EnvironmentService } from "./environment.service";

const now = new Date();
const projectId = "project-uuid";
const userId = "user-uuid";
const envId = "env-uuid";
const varId = "var-uuid";
const ipAddress = "127.0.0.1";

const vaultGroupId = "vault-group-uuid";

const mockVariable = {
  id: varId,
  environmentId: envId,
  key: "DATABASE_URL",
  encryptedValue: "encrypted-base64",
  iv: "iv-base64",
  authTag: "tag-base64",
  description: "The database URL",
  isRequired: true,
  createdAt: now,
  updatedAt: now,
};

const mockVariableWithEnv = {
  ...mockVariable,
  environment: { vaultGroup: { name: "Default" } },
};

const mockEnvironment = {
  id: envId,
  projectId,
  type: "DEVELOPMENT",
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
      create: mock(() => Promise.resolve(mockEnvironment)),
    },
    envVariable: {
      create: mock(() => Promise.resolve(mockVariable)),
      findMany: mock(() => Promise.resolve([mockVariable])),
      findFirst: mock(() => Promise.resolve(null)),
      count: mock(() => Promise.resolve(1)),
      update: mock(() => Promise.resolve(mockVariable)),
      delete: mock(() => Promise.resolve(mockVariable)),
    },
    envVariableVersion: {
      create: mock(() => Promise.resolve({})),
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

describe("EnvironmentService", () => {
  let service: EnvironmentService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockAuditLog: ReturnType<typeof createMockAuditLogService>;

  beforeEach(() => {
    mock.restore();
    mockPrisma = createMockPrisma();
    mockAuditLog = createMockAuditLogService();
    const { EnvironmentRepository } = require("./environment.repository");
    const envHelper = new EnvironmentRepository(mockPrisma);
    const mockNotificationService = { notify: mock(() => Promise.resolve()) } as any;
    const mockPlanEnforcement = { enforceForProject: mock(() => Promise.resolve()) } as any;
    service = new EnvironmentService(
      mockPrisma,
      mockAuditLog,
      envHelper,
      mockNotificationService,
      mockPlanEnforcement,
    );
  });

  describe("create", () => {
    it("should create an env variable with encryption", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(mockEnvironment);

      const result = await service.create(
        projectId,
        {
          vaultGroupId,
          environmentType: "DEVELOPMENT",
          key: "DATABASE_URL",
          encryptedValue: "encrypted",
          iv: "iv123",
          authTag: "tag123",
          description: "The database URL",
          isRequired: true,
        },
        userId,
        ipAddress,
      );

      expect(result.id).toBe(varId);
      expect(result.key).toBe("DATABASE_URL");
      expect(result.encryptedValue).toBe("encrypted-base64");
      expect(mockPrisma.envVariable.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          environmentId: envId,
          key: "DATABASE_URL",
          encryptedValue: "encrypted",
          iv: "iv123",
          authTag: "tag123",
        }),
      });
    });

    it("should write audit log on create", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(mockEnvironment);

      await service.create(
        projectId,
        {
          vaultGroupId,
          environmentType: "DEVELOPMENT",
          key: "API_KEY",
          encryptedValue: "encrypted",
          iv: "iv123",
          authTag: "tag123",
        },
        userId,
        ipAddress,
      );

      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          projectId,
          action: "UPLOAD",
          resourceType: "ENV_VARIABLE",
          ipAddress,
        }),
      );
    });

    it("should auto-create environment if it doesn't exist", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "EDITOR" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(null);

      await service.create(
        projectId,
        {
          vaultGroupId,
          environmentType: "STAGING",
          key: "API_KEY",
          encryptedValue: "encrypted",
          iv: "iv123",
          authTag: "tag123",
        },
        userId,
        ipAddress,
      );

      expect(mockPrisma.environment.create).toHaveBeenCalledWith({
        data: { projectId, vaultGroupId, type: "STAGING" },
      });
    });
  });

  describe("list", () => {
    it("should return encrypted values for OWNER", async () => {
      const result = await service.list(projectId, userId, vaultGroupId, "DEVELOPMENT");

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.encryptedValue).toBe("encrypted-base64");
    });

    it("should write audit log when reading decrypted values", async () => {
      await service.list(projectId, userId, vaultGroupId, "DEVELOPMENT", 1, 20, ipAddress);

      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          projectId,
          action: "READ",
          resourceType: "ENV_VARIABLE",
        }),
      );
    });

    it("should return encrypted values for VIEWER", async () => {
      const result = await service.list(projectId, userId, vaultGroupId, "DEVELOPMENT");

      expect(result.items[0]!.encryptedValue).toBe("encrypted-base64");
    });

    it("should filter by environment type when provided", async () => {
      await service.list(projectId, userId, vaultGroupId, "STAGING", 1, 10);

      expect(mockPrisma.envVariable.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { environment: { projectId, vaultGroupId, type: "STAGING" } },
        }),
      );
    });

    it("should list all environments when no filter provided", async () => {
      await service.list(projectId, userId, vaultGroupId, undefined, 1, 20);

      expect(mockPrisma.envVariable.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { environment: { projectId, vaultGroupId } },
        }),
      );
    });

    it("should return correct pagination", async () => {
      mockPrisma.envVariable.count.mockResolvedValueOnce(25);

      const result = await service.list(projectId, userId, vaultGroupId, undefined, 2, 10);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });
  });

  describe("update", () => {
    it("should update key and value with version snapshot", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariableWithEnv);

      await service.update(
        projectId,
        varId,
        { key: "NEW_KEY", encryptedValue: "new-encrypted", iv: "new-iv", authTag: "new-tag" },
        userId,
        ipAddress,
      );

      expect(mockPrisma.envVariableVersion.create).toHaveBeenCalledWith({
        data: {
          variableId: varId,
          encryptedValue: mockVariable.encryptedValue,
          iv: mockVariable.iv,
          authTag: mockVariable.authTag,
          changedBy: userId,
        },
      });
      expect(mockPrisma.envVariable.update).toHaveBeenCalled();
    });

    it("should write audit log on update", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariableWithEnv);

      await service.update(projectId, varId, { key: "NEW_KEY" }, userId, ipAddress);

      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "UPDATE",
          resourceType: "ENV_VARIABLE",
          resourceId: varId,
        }),
      );
    });

    it("should update metadata without creating version snapshot", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "EDITOR" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariableWithEnv);

      await service.update(projectId, varId, { description: "Updated desc" }, userId, ipAddress);

      expect(mockPrisma.envVariableVersion.create).not.toHaveBeenCalled();
      expect(mockPrisma.envVariable.update).toHaveBeenCalledWith({
        where: { id: varId },
        data: { description: "Updated desc" },
      });
    });

    it("should throw NotFoundError when variable doesn't exist", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(null);

      expect(
        service.update(projectId, varId, { key: "X" }, userId, ipAddress),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("delete", () => {
    it("should delete variable when user is OWNER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariableWithEnv);

      const result = await service.delete(projectId, varId, userId, ipAddress);

      expect(result.message).toBe("Environment variable deleted successfully");
      expect(mockPrisma.envVariable.delete).toHaveBeenCalledWith({ where: { id: varId } });
    });

    it("should write audit log on delete", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariableWithEnv);

      await service.delete(projectId, varId, userId, ipAddress);

      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DELETE",
          resourceType: "ENV_VARIABLE",
          resourceId: varId,
        }),
      );
    });

    it("should delete variable when user is EDITOR", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "EDITOR" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariableWithEnv);

      await service.delete(projectId, varId, userId, ipAddress);

      expect(mockPrisma.envVariable.delete).toHaveBeenCalled();
    });

    it("should throw NotFoundError when variable doesn't exist", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(null);

      expect(service.delete(projectId, varId, userId, ipAddress)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });
});
