import "reflect-metadata";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { NotFoundError } from "@/common/errors";
import { EnvVariableVersionService } from "./env-variable-version.service";

const now = new Date();
const projectId = "project-uuid";
const userId = "user-uuid";
const varId = "var-uuid";
const versionId = "version-uuid";

const mockVariable = {
  id: varId,
  environmentId: "env-uuid",
  key: "DATABASE_URL",
  encryptedValue: "old-encrypted",
  iv: "old-iv",
  authTag: "old-tag",
  description: "The database URL",
  isRequired: true,
  createdAt: now,
  updatedAt: now,
};

const mockVersion = {
  id: versionId,
  variableId: varId,
  encryptedValue: "prev-encrypted",
  iv: "prev-iv",
  authTag: "prev-tag",
  changedBy: userId,
  createdAt: now,
};

const mockUser = {
  id: userId,
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
};

function createMockPrisma() {
  return {
    projectMember: {
      findUnique: mock(() => Promise.resolve(null)),
    },
    envVariable: {
      findFirst: mock(() => Promise.resolve(null)),
      update: mock(() => Promise.resolve(mockVariable)),
    },
    envVariableVersion: {
      findMany: mock(() => Promise.resolve([])),
      findFirst: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({})),
    },
    user: {
      findMany: mock(() => Promise.resolve([mockUser])),
    },
  } as any;
}

describe("EnvVariableVersionService", () => {
  let service: EnvVariableVersionService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mock.restore();
    mockPrisma = createMockPrisma();
    service = new EnvVariableVersionService(mockPrisma);
  });

  describe("listVersions", () => {
    it("should return encrypted values for any role", async () => {
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);
      mockPrisma.envVariableVersion.findMany.mockResolvedValueOnce([mockVersion]);

      const result = await service.listVersions(projectId, varId);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.encryptedValue).toBe(mockVersion.encryptedValue);
      expect(result.items[0]!.iv).toBe(mockVersion.iv);
      expect(result.items[0]!.authTag).toBe(mockVersion.authTag);
    });

    it("should include changedByName from user lookup", async () => {
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);
      mockPrisma.envVariableVersion.findMany.mockResolvedValueOnce([mockVersion]);

      const result = await service.listVersions(projectId, varId);

      expect(result.items[0]!.changedByName).toBe("Jane Doe");
    });

    it("should fallback to email when no name parts present", async () => {
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);
      mockPrisma.envVariableVersion.findMany.mockResolvedValueOnce([mockVersion]);
      mockPrisma.user.findMany.mockResolvedValueOnce([
        { id: userId, firstName: "", lastName: "", email: "jane@example.com" },
      ]);

      const result = await service.listVersions(projectId, varId);

      expect(result.items[0]!.changedByName).toBe("jane@example.com");
    });

    it("should fallback to 'Unknown user' for deleted users", async () => {
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);
      mockPrisma.envVariableVersion.findMany.mockResolvedValueOnce([mockVersion]);
      mockPrisma.user.findMany.mockResolvedValueOnce([]);

      const result = await service.listVersions(projectId, varId);

      expect(result.items[0]!.changedByName).toBe("Unknown user");
    });

    it("should return empty items when no versions exist", async () => {
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);
      mockPrisma.envVariableVersion.findMany.mockResolvedValueOnce([]);

      const result = await service.listVersions(projectId, varId);

      expect(result.items).toHaveLength(0);
    });

    it("should throw NotFoundError when variable not in project", async () => {
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(null);

      expect(service.listVersions(projectId, varId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("rollback", () => {
    it("should snapshot current value as new version before updating", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);
      mockPrisma.envVariableVersion.findFirst.mockResolvedValueOnce(mockVersion);

      await service.rollback(projectId, varId, versionId, userId);

      expect(mockPrisma.envVariableVersion.create).toHaveBeenCalledWith({
        data: {
          variableId: varId,
          encryptedValue: mockVariable.encryptedValue,
          iv: mockVariable.iv,
          authTag: mockVariable.authTag,
          changedBy: userId,
        },
      });
    });

    it("should copy encrypted triple from version directly without decrypt/re-encrypt", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);
      mockPrisma.envVariableVersion.findFirst.mockResolvedValueOnce(mockVersion);

      await service.rollback(projectId, varId, versionId, userId);

      expect(mockPrisma.envVariable.update).toHaveBeenCalledWith({
        where: { id: varId },
        data: {
          encryptedValue: mockVersion.encryptedValue,
          iv: mockVersion.iv,
          authTag: mockVersion.authTag,
        },
      });
    });

    it("should return the updated variable with decrypted value", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);
      mockPrisma.envVariableVersion.findFirst.mockResolvedValueOnce(mockVersion);

      const result = await service.rollback(projectId, varId, versionId, userId);

      expect(result.id).toBe(varId);
      expect(result.encryptedValue).toBeDefined();
    });

    it("should throw NotFoundError when variable not found", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(null);

      expect(service.rollback(projectId, varId, versionId, userId)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("should throw NotFoundError when version does not belong to the variable", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);
      mockPrisma.envVariableVersion.findFirst.mockResolvedValueOnce(null);

      expect(service.rollback(projectId, varId, versionId, userId)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });
});
