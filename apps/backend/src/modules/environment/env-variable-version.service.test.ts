import "reflect-metadata";
import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { ForbiddenError, NotFoundError } from "@/common/errors";
import * as encryption from "@/common/utils/encryption";
import { EnvVariableVersionService } from "./env-variable-version.service";

const now = new Date();
const projectId = "project-uuid";
const userId = "user-uuid";
const varId = "var-uuid";
const versionId = "version-uuid";

const fakeProjectKey = Buffer.alloc(32, 1);

const mockEncrypted = {
  ciphertext: "new-encrypted",
  iv: "new-iv",
  authTag: "new-tag",
};

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

  afterEach(() => {
    mock.restore();
  });

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    const { EnvironmentRepository } = require("./environment.repository");
    const envHelper = new EnvironmentRepository(mockPrisma);
    service = new EnvVariableVersionService(mockPrisma, envHelper);

    spyOn(encryption, "deriveProjectKey").mockReturnValue(fakeProjectKey);
    spyOn(encryption, "encrypt").mockReturnValue(mockEncrypted);
    spyOn(encryption, "decrypt").mockReturnValue("postgres://localhost/db");
  });

  describe("listVersions", () => {
    it("should return masked values for VIEWER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "VIEWER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);
      mockPrisma.envVariableVersion.findMany.mockResolvedValueOnce([mockVersion]);

      const result = await service.listVersions(projectId, varId, userId);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.value).toBe("********");
      expect(encryption.decrypt).not.toHaveBeenCalled();
    });

    it("should return decrypted values for OWNER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);
      mockPrisma.envVariableVersion.findMany.mockResolvedValueOnce([mockVersion]);

      const result = await service.listVersions(projectId, varId, userId);

      expect(result.items[0]!.value).toBe("postgres://localhost/db");
      expect(encryption.decrypt).toHaveBeenCalled();
    });

    it("should return decrypted values for EDITOR", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "EDITOR" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);
      mockPrisma.envVariableVersion.findMany.mockResolvedValueOnce([mockVersion]);

      const result = await service.listVersions(projectId, varId, userId);

      expect(result.items[0]!.value).toBe("postgres://localhost/db");
    });

    it("should include changedByName from user lookup", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);
      mockPrisma.envVariableVersion.findMany.mockResolvedValueOnce([mockVersion]);

      const result = await service.listVersions(projectId, varId, userId);

      expect(result.items[0]!.changedByName).toBe("Jane Doe");
    });

    it("should fallback to email when no name parts present", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);
      mockPrisma.envVariableVersion.findMany.mockResolvedValueOnce([mockVersion]);
      mockPrisma.user.findMany.mockResolvedValueOnce([
        { id: userId, firstName: "", lastName: "", email: "jane@example.com" },
      ]);

      const result = await service.listVersions(projectId, varId, userId);

      expect(result.items[0]!.changedByName).toBe("jane@example.com");
    });

    it("should fallback to 'Unknown user' for deleted users", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);
      mockPrisma.envVariableVersion.findMany.mockResolvedValueOnce([mockVersion]);
      mockPrisma.user.findMany.mockResolvedValueOnce([]);

      const result = await service.listVersions(projectId, varId, userId);

      expect(result.items[0]!.changedByName).toBe("Unknown user");
    });

    it("should return empty items when no versions exist", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);
      mockPrisma.envVariableVersion.findMany.mockResolvedValueOnce([]);

      const result = await service.listVersions(projectId, varId, userId);

      expect(result.items).toHaveLength(0);
    });

    it("should throw NotFoundError when variable not in project", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(null);

      expect(service.listVersions(projectId, varId, userId)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should throw NotFoundError when user is not a member", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(null);

      expect(service.listVersions(projectId, varId, userId)).rejects.toBeInstanceOf(NotFoundError);
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

    it("should decrypt old version and re-encrypt with fresh IV before updating", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);
      mockPrisma.envVariableVersion.findFirst.mockResolvedValueOnce(mockVersion);

      await service.rollback(projectId, varId, versionId, userId);

      expect(encryption.decrypt).toHaveBeenCalledWith(
        mockVersion.encryptedValue,
        mockVersion.iv,
        mockVersion.authTag,
        fakeProjectKey,
      );
      expect(encryption.encrypt).toHaveBeenCalledWith("postgres://localhost/db", fakeProjectKey);
      expect(mockPrisma.envVariable.update).toHaveBeenCalledWith({
        where: { id: varId },
        data: {
          encryptedValue: mockEncrypted.ciphertext,
          iv: mockEncrypted.iv,
          authTag: mockEncrypted.authTag,
        },
      });
    });

    it("should return the updated variable with decrypted value", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findFirst.mockResolvedValueOnce(mockVariable);
      mockPrisma.envVariableVersion.findFirst.mockResolvedValueOnce(mockVersion);

      const result = await service.rollback(projectId, varId, versionId, userId);

      expect(result.id).toBe(varId);
      expect(result.value).toBe("postgres://localhost/db");
    });

    it("should throw ForbiddenError for VIEWER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "VIEWER" });

      expect(service.rollback(projectId, varId, versionId, userId)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
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
