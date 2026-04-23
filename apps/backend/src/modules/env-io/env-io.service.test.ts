import "reflect-metadata";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { NotFoundError } from "@/common/errors";
import { ProjectVaultRepository } from "@/modules/project-vault";
import { EnvironmentIOService } from "./env-io.service";

const now = new Date();
const projectId = "project-uuid";
const userId = "user-uuid";
const vaultId = "vault-uuid";
const varId = "var-uuid";
const ipAddress = "127.0.0.1";

const mockVariable = {
  id: varId,
  vaultId,
  key: "DATABASE_URL",
  encryptedValue: "encrypted-base64",
  iv: "iv-base64",
  authTag: "tag-base64",
  description: "The database URL",
  isRequired: true,
  sortOrder: null,
  encryptedComment: null,
  commentIv: null,
  commentAuthTag: null,
  createdAt: now,
  updatedAt: now,
};

const mockVault = {
  id: vaultId,
  projectId,
  name: "api-prod",
  directoryPath: null,
  tags: ["prod"],
  createdAt: now,
  updatedAt: now,
};

function createMockPrisma() {
  return {
    projectMember: {
      findUnique: mock(() => Promise.resolve(null)),
    },
    vault: {
      findFirst: mock(() => Promise.resolve(mockVault)),
    },
    envVariable: {
      upsert: mock(() => Promise.resolve(mockVariable)),
      findMany: mock(() => Promise.resolve([mockVariable])),
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
    const vaultRepo = new ProjectVaultRepository(mockPrisma);
    service = new EnvironmentIOService(mockPrisma, mockAuditLog, vaultRepo);
  });

  describe("bulkImport", () => {
    it("should import variables from entries", async () => {
      const result = await service.bulkImport(
        projectId,
        vaultId,
        {
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
      mockPrisma.envVariable.upsert.mockResolvedValueOnce(updatedVar);

      const result = await service.bulkImport(
        projectId,
        vaultId,
        {
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
          where: { vaultId_key: { vaultId: mockVault.id, key: "DATABASE_URL" } },
          create: expect.objectContaining({ key: "DATABASE_URL", encryptedValue: "encrypted" }),
          update: expect.objectContaining({
            encryptedValue: "encrypted",
            iv: "iv123",
            authTag: "tag123",
          }),
        }),
      );
    });

    it("should throw NotFoundError when vault doesn't exist", async () => {
      mockPrisma.vault.findFirst.mockResolvedValueOnce(null);

      expect(
        service.bulkImport(
          projectId,
          vaultId,
          {
            entries: [{ key: "KEY", encryptedValue: "encrypted", iv: "iv123", authTag: "tag123" }],
          },
          userId,
          ipAddress,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should write audit log on import", async () => {
      await service.bulkImport(
        projectId,
        vaultId,
        {
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
      const result = await service.export(projectId, vaultId, userId, ipAddress);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]!.key).toBe("DATABASE_URL");
      expect(result.entries[0]!.encryptedValue).toBe("encrypted-base64");
      expect(result.vaultName).toBe("api-prod");
    });

    it("should write audit log on export", async () => {
      await service.export(projectId, vaultId, userId, ipAddress);

      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DOWNLOAD",
          resourceType: "ENV_VARIABLE",
          metadata: expect.objectContaining({ vaultName: "api-prod" }),
        }),
      );
    });

    it("should throw NotFoundError when vault doesn't exist", async () => {
      mockPrisma.vault.findFirst.mockResolvedValueOnce(null);

      expect(service.export(projectId, vaultId, userId, ipAddress)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe("generateExample", () => {
    it("should generate .env.example content", async () => {
      const result = await service.generateExample(projectId, vaultId);

      expect(result.content).toContain("DATABASE_URL=");
      expect(result.content).toContain("(required)");
      expect(result.content).toContain("The database URL");
      expect(result.vaultName).toBe("api-prod");
    });

    it("should throw NotFoundError when vault doesn't exist", async () => {
      mockPrisma.vault.findFirst.mockResolvedValueOnce(null);

      expect(service.generateExample(projectId, vaultId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
