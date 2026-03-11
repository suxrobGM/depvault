import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { ForbiddenError, NotFoundError } from "@/common/errors";
import * as encryption from "@/common/utils/encryption";
import { EnvironmentService } from "./environment.service";

const now = new Date();
const projectId = "project-uuid";
const userId = "user-uuid";
const envId = "env-uuid";
const varId = "var-uuid";
const ipAddress = "127.0.0.1";

const fakeProjectKey = Buffer.alloc(32, 1);

const mockEncrypted = {
  ciphertext: "encrypted-base64",
  iv: "iv-base64",
  authTag: "tag-base64",
};

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
    mockPrisma = createMockPrisma();
    mockAuditLog = createMockAuditLogService();
    const { EnvironmentRepository } = require("./environment.repository");
    const envHelper = new EnvironmentRepository(mockPrisma);
    const mockNotificationService = { notify: mock(() => Promise.resolve()) } as any;
    service = new EnvironmentService(mockPrisma, mockAuditLog, envHelper, mockNotificationService);

    spyOn(encryption, "deriveProjectKey").mockReturnValue(fakeProjectKey);
    spyOn(encryption, "encrypt").mockReturnValue(mockEncrypted);
    spyOn(encryption, "decrypt").mockReturnValue("postgres://localhost/db");
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
          value: "postgres://localhost/db",
          description: "The database URL",
          isRequired: true,
        },
        userId,
        ipAddress,
      );

      expect(result.id).toBe(varId);
      expect(result.key).toBe("DATABASE_URL");
      expect(result.value).toBe("postgres://localhost/db");
      expect(encryption.encrypt).toHaveBeenCalledWith("postgres://localhost/db", fakeProjectKey);
      expect(mockPrisma.envVariable.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          environmentId: envId,
          key: "DATABASE_URL",
          encryptedValue: "encrypted-base64",
          iv: "iv-base64",
          authTag: "tag-base64",
        }),
      });
    });

    it("should write audit log on create", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(mockEnvironment);

      await service.create(
        projectId,
        { vaultGroupId, environmentType: "DEVELOPMENT", key: "API_KEY", value: "secret" },
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
        { vaultGroupId, environmentType: "STAGING", key: "API_KEY", value: "secret" },
        userId,
        ipAddress,
      );

      expect(mockPrisma.environment.create).toHaveBeenCalledWith({
        data: { projectId, vaultGroupId, type: "STAGING" },
      });
    });

    it("should throw ForbiddenError for VIEWER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "VIEWER" });

      expect(
        service.create(
          projectId,
          { vaultGroupId, environmentType: "DEVELOPMENT", key: "K", value: "V" },
          userId,
          ipAddress,
        ),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("should throw NotFoundError when user is not a member", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(null);

      expect(
        service.create(
          projectId,
          { vaultGroupId, environmentType: "DEVELOPMENT", key: "K", value: "V" },
          userId,
          ipAddress,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("list", () => {
    it("should return decrypted values for OWNER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });

      const result = await service.list(projectId, userId, vaultGroupId, "DEVELOPMENT");

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.value).toBe("postgres://localhost/db");
      expect(encryption.decrypt).toHaveBeenCalled();
    });

    it("should write audit log when reading decrypted values", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });

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

    it("should return masked values for VIEWER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "VIEWER" });
      const decryptSpy = spyOn(encryption, "decrypt");
      decryptSpy.mockClear();

      const result = await service.list(projectId, userId, vaultGroupId, "DEVELOPMENT");

      expect(result.items[0]!.value).toBe("********");
      expect(decryptSpy).not.toHaveBeenCalled();
    });

    it("should filter by environment type when provided", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "EDITOR" });

      await service.list(projectId, userId, vaultGroupId, "STAGING", 1, 10);

      expect(mockPrisma.envVariable.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { environment: { projectId, vaultGroupId, type: "STAGING" } },
        }),
      );
    });

    it("should list all environments when no filter provided", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });

      await service.list(projectId, userId, vaultGroupId, undefined, 1, 20);

      expect(mockPrisma.envVariable.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { environment: { projectId, vaultGroupId } },
        }),
      );
    });

    it("should return correct pagination", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
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
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);

      await service.update(
        projectId,
        varId,
        { key: "NEW_KEY", value: "new-value" },
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
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);

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
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);

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

    it("should throw ForbiddenError for VIEWER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "VIEWER" });

      expect(
        service.update(projectId, varId, { key: "X" }, userId, ipAddress),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe("delete", () => {
    it("should delete variable when user is OWNER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);

      const result = await service.delete(projectId, varId, userId, ipAddress);

      expect(result.message).toBe("Environment variable deleted successfully");
      expect(mockPrisma.envVariable.delete).toHaveBeenCalledWith({ where: { id: varId } });
    });

    it("should write audit log on delete", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);

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
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);

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

    it("should throw ForbiddenError for VIEWER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "VIEWER" });

      expect(service.delete(projectId, varId, userId, ipAddress)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it("should throw NotFoundError when user is not a member", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(null);

      expect(service.delete(projectId, varId, userId, ipAddress)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });
});
