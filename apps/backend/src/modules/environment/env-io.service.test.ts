import "reflect-metadata";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { NotFoundError } from "@/common/errors";
import { EnvironmentType } from "@/generated/prisma";
import { EnvironmentIOService } from "./env-io.service";

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
      upsert: mock(() => Promise.resolve(mockVariable)),
      findMany: mock(() => Promise.resolve([mockVariable])),
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

describe("EnvironmentIOService", () => {
  let service: EnvironmentIOService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockAuditLog: ReturnType<typeof createMockAuditLogService>;

  beforeEach(() => {
    mock.restore();
    mockPrisma = createMockPrisma();
    mockAuditLog = createMockAuditLogService();
    const { EnvironmentRepository } = require("./environment.repository");
    const envRepo = new EnvironmentRepository(mockPrisma);
    service = new EnvironmentIOService(mockPrisma, mockAuditLog, envRepo);
  });

  describe("bulkImport", () => {
    it("should import variables from entries", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(mockEnvironment);

      const result = await service.bulkImport(
        projectId,
        {
          vaultGroupId,
          environmentType: "DEVELOPMENT",
          entries: [
            { key: "DATABASE_URL", encryptedValue: "encrypted", iv: "iv123", authTag: "tag123" },
          ],
        },
        userId,
        ipAddress,
      );

      expect(result.imported).toBe(1);
      expect(result.variables).toHaveLength(1);
      expect(mockPrisma.envVariable.upsert).toHaveBeenCalled();
    });

    it("should upsert existing keys instead of skipping", async () => {
      const updatedVar = { ...mockVariable, updatedAt: new Date(now.getTime() + 1000) };
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "EDITOR" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(mockEnvironment);
      mockPrisma.envVariable.upsert.mockResolvedValueOnce(updatedVar);

      const result = await service.bulkImport(
        projectId,
        {
          vaultGroupId,
          environmentType: "DEVELOPMENT",
          entries: [
            { key: "DATABASE_URL", encryptedValue: "encrypted", iv: "iv123", authTag: "tag123" },
          ],
        },
        userId,
        ipAddress,
      );

      expect(result.imported).toBe(1);
      expect(result.updated).toBe(1);
      expect(mockPrisma.envVariable.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { environmentId_key: { environmentId: mockEnvironment.id, key: "DATABASE_URL" } },
          create: expect.objectContaining({ key: "DATABASE_URL", encryptedValue: "encrypted" }),
          update: expect.objectContaining({
            encryptedValue: "encrypted",
            iv: "iv123",
            authTag: "tag123",
          }),
        }),
      );
    });

    it("should auto-create environment if it doesn't exist", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(null);

      await service.bulkImport(
        projectId,
        {
          vaultGroupId,
          environmentType: "STAGING",
          entries: [{ key: "KEY", encryptedValue: "encrypted", iv: "iv123", authTag: "tag123" }],
        },
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

      await service.bulkImport(
        projectId,
        {
          vaultGroupId,
          environmentType: "DEVELOPMENT",
          entries: [{ key: "KEY", encryptedValue: "encrypted", iv: "iv123", authTag: "tag123" }],
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
          metadata: expect.objectContaining({ imported: 1 }),
        }),
      );
    });
  });

  describe("export", () => {
    it("should export encrypted variables as entries", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(mockEnvironment);

      const result = await service.export(
        projectId,
        vaultGroupId,
        EnvironmentType.DEVELOPMENT,
        userId,
        ipAddress,
      );

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]!.key).toBe("DATABASE_URL");
      expect(result.entries[0]!.encryptedValue).toBe("encrypted-base64");
      expect(result.environmentType).toBe("DEVELOPMENT");
    });

    it("should write audit log on export", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "EDITOR" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(mockEnvironment);

      await service.export(projectId, vaultGroupId, EnvironmentType.DEVELOPMENT, userId, ipAddress);

      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DOWNLOAD",
          resourceType: "ENV_VARIABLE",
          metadata: expect.objectContaining({ environmentType: "DEVELOPMENT" }),
        }),
      );
    });

    it("should throw NotFoundError when environment doesn't exist", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(null);

      expect(
        service.export(projectId, vaultGroupId, EnvironmentType.PRODUCTION, userId, ipAddress),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("generateExample", () => {
    it("should generate .env.example content", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "VIEWER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(mockEnvironment);

      const result = await service.generateExample(vaultGroupId, EnvironmentType.DEVELOPMENT);

      expect(result.content).toContain("DATABASE_URL=");
      expect(result.content).toContain("(required)");
      expect(result.content).toContain("The database URL");
      expect(result.environmentType).toBe("DEVELOPMENT");
    });

    it("should allow VIEWER access", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "VIEWER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(mockEnvironment);

      const result = await service.generateExample(vaultGroupId, EnvironmentType.DEVELOPMENT);

      expect(result.environmentType).toBe("DEVELOPMENT");
    });

    it("should generate example without encrypted values", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(mockEnvironment);

      const result = await service.generateExample(vaultGroupId, EnvironmentType.DEVELOPMENT);

      expect(result.content).toBeDefined();
    });

    it("should throw NotFoundError when environment doesn't exist", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(null);

      expect(
        service.generateExample(vaultGroupId, EnvironmentType.PRODUCTION),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
