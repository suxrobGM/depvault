import "reflect-metadata";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { ForbiddenError, NotFoundError } from "@/common/errors";
import * as encryption from "@/common/utils/encryption";
import { EnvironmentType } from "@/generated/prisma";
import { EnvironmentIOService } from "./env-io.service";

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
      findUnique: mock(() => Promise.resolve(null)),
    },
  } as any;
}

function createMockAuditLogService() {
  return {
    log: mock(() => Promise.resolve()),
  } as any;
}

describe("EnvironmentIOService", () => {
  let service: EnvironmentIOService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockAuditLog: ReturnType<typeof createMockAuditLogService>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockAuditLog = createMockAuditLogService();
    const { EnvironmentRepository } = require("./environment.repository");
    const envRepo = new EnvironmentRepository(mockPrisma);
    service = new EnvironmentIOService(mockPrisma, mockAuditLog, envRepo);

    spyOn(encryption, "deriveProjectKey").mockReturnValue(fakeProjectKey);
    spyOn(encryption, "encrypt").mockReturnValue(mockEncrypted);
    spyOn(encryption, "decrypt").mockReturnValue("postgres://localhost/db");
  });

  describe("bulkImport", () => {
    it("should import variables from .env format", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(mockEnvironment);
      mockPrisma.envVariable.findUnique.mockResolvedValueOnce(null);

      const result = await service.bulkImport(
        projectId,
        {
          vaultGroupId,
          environmentType: "DEVELOPMENT",
          format: "env",
          content: "DATABASE_URL=postgres://localhost/db",
        },
        userId,
        ipAddress,
      );

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.variables).toHaveLength(1);
      expect(encryption.encrypt).toHaveBeenCalled();
    });

    it("should skip existing keys", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "EDITOR" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(mockEnvironment);
      mockPrisma.envVariable.findUnique.mockResolvedValueOnce(mockVariable);

      const result = await service.bulkImport(
        projectId,
        {
          vaultGroupId,
          environmentType: "DEVELOPMENT",
          format: "env",
          content: "DATABASE_URL=new-value",
        },
        userId,
        ipAddress,
      );

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockPrisma.envVariable.create).not.toHaveBeenCalled();
    });

    it("should auto-create environment if it doesn't exist", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(null);
      mockPrisma.envVariable.findUnique.mockResolvedValueOnce(null);

      await service.bulkImport(
        projectId,
        { vaultGroupId, environmentType: "STAGING", format: "env", content: "KEY=value" },
        userId,
        ipAddress,
      );

      expect(mockPrisma.environment.create).toHaveBeenCalledWith({
        data: { projectId, vaultGroupId, type: "STAGING" },
      });
    });

    it("should write audit log on import", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(mockEnvironment);
      mockPrisma.envVariable.findUnique.mockResolvedValueOnce(null);

      await service.bulkImport(
        projectId,
        { vaultGroupId, environmentType: "DEVELOPMENT", format: "env", content: "KEY=value" },
        userId,
        ipAddress,
      );

      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          projectId,
          action: "UPLOAD",
          resourceType: "ENV_VARIABLE",
          metadata: expect.objectContaining({ imported: 1, skipped: 0, format: "env" }),
        }),
      );
    });

    it("should throw ForbiddenError for VIEWER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "VIEWER" });

      expect(
        service.bulkImport(
          projectId,
          { vaultGroupId, environmentType: "DEVELOPMENT", format: "env", content: "K=V" },
          userId,
          ipAddress,
        ),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("should throw NotFoundError when user is not a member", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(null);

      expect(
        service.bulkImport(
          projectId,
          { vaultGroupId, environmentType: "DEVELOPMENT", format: "env", content: "K=V" },
          userId,
          ipAddress,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("export", () => {
    it("should export decrypted variables in .env format", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(mockEnvironment);

      const result = await service.export(
        projectId,
        vaultGroupId,
        EnvironmentType.DEVELOPMENT,
        "env",
        userId,
        ipAddress,
      );

      expect(result.content).toContain("DATABASE_URL=");
      expect(result.format).toBe("env");
      expect(result.environmentType).toBe("DEVELOPMENT");
      expect(encryption.decrypt).toHaveBeenCalled();
    });

    it("should write audit log on export", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "EDITOR" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(mockEnvironment);

      await service.export(
        projectId,
        vaultGroupId,
        EnvironmentType.DEVELOPMENT,
        "env",
        userId,
        ipAddress,
      );

      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DOWNLOAD",
          resourceType: "ENV_VARIABLE",
          metadata: expect.objectContaining({ format: "env", environmentType: "DEVELOPMENT" }),
        }),
      );
    });

    it("should throw NotFoundError when environment doesn't exist", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(null);

      expect(
        service.export(
          projectId,
          vaultGroupId,
          EnvironmentType.PRODUCTION,
          "env",
          userId,
          ipAddress,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should throw ForbiddenError for VIEWER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "VIEWER" });

      expect(
        service.export(
          projectId,
          vaultGroupId,
          EnvironmentType.DEVELOPMENT,
          "env",
          userId,
          ipAddress,
        ),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe("generateExample", () => {
    it("should generate .env.example content", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "VIEWER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(mockEnvironment);

      const result = await service.generateExample(
        projectId,
        vaultGroupId,
        EnvironmentType.DEVELOPMENT,
        userId,
      );

      expect(result.content).toContain("DATABASE_URL=");
      expect(result.content).toContain("(required)");
      expect(result.content).toContain("The database URL");
      expect(result.environmentType).toBe("DEVELOPMENT");
    });

    it("should allow VIEWER access", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "VIEWER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(mockEnvironment);

      const result = await service.generateExample(
        projectId,
        vaultGroupId,
        EnvironmentType.DEVELOPMENT,
        userId,
      );

      expect(result.environmentType).toBe("DEVELOPMENT");
    });

    it("should not decrypt values", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(mockEnvironment);
      const decryptSpy = spyOn(encryption, "decrypt");
      decryptSpy.mockClear();

      await service.generateExample(projectId, vaultGroupId, EnvironmentType.DEVELOPMENT, userId);

      expect(decryptSpy).not.toHaveBeenCalled();
    });

    it("should throw NotFoundError when environment doesn't exist", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(null);

      expect(
        service.generateExample(projectId, vaultGroupId, EnvironmentType.PRODUCTION, userId),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should throw NotFoundError when user is not a member", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(null);

      expect(
        service.generateExample(projectId, vaultGroupId, EnvironmentType.DEVELOPMENT, userId),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
