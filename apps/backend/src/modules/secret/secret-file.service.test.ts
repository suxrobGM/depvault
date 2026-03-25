import "reflect-metadata";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { BadRequestError, NotFoundError } from "@/common/errors";
import { SecretFileService } from "./secret-file.service";

const now = new Date();
const projectId = "project-uuid";
const userId = "user-uuid";
const fileId = "file-uuid";
const vaultGroupId = "vault-group-uuid";

const mockVaultGroup = { id: vaultGroupId, name: "Default", projectId };

const mockSecretFile = {
  id: fileId,
  vaultGroupId,
  name: "config.json",
  description: "Config file",
  encryptedContent: Buffer.from("encrypted-content"),
  iv: "iv-base64",
  authTag: "tag-base64",
  mimeType: "application/json",
  fileSize: 1024,
  uploadedBy: userId,
  createdAt: now,
  updatedAt: now,
  vaultGroup: { id: vaultGroupId, name: "Default" },
};

function createMockPrisma() {
  return {
    projectMember: {
      findUnique: mock(() => Promise.resolve(null)),
    },
    secretFile: {
      create: mock(() => Promise.resolve(mockSecretFile)),
      findMany: mock(() => Promise.resolve([mockSecretFile])),
      findFirst: mock(() => Promise.resolve(null)),
      findUnique: mock(() => Promise.resolve(null)),
      count: mock(() => Promise.resolve(1)),
      update: mock(() => Promise.resolve(mockSecretFile)),
      delete: mock(() => Promise.resolve(mockSecretFile)),
    },
    secretFileVersion: {
      create: mock(() => Promise.resolve({})),
    },
    secretFileAuditLog: {
      create: mock(() => Promise.resolve({})),
    },
    vaultGroup: {
      findFirst: mock(() => Promise.resolve(mockVaultGroup)),
    },
  } as any;
}

function createMockAuditLogService() {
  return {
    log: mock(() => Promise.resolve()),
  } as any;
}

describe("SecretFileService", () => {
  let service: SecretFileService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mock.restore();
    mockPrisma = createMockPrisma();
    const mockNotificationService = { notify: mock(() => Promise.resolve()) } as any;
    const mockPlanEnforcement = { enforceForProject: mock(() => Promise.resolve()) } as any;
    service = new SecretFileService(
      mockPrisma,
      createMockAuditLogService(),
      mockNotificationService,
      mockPlanEnforcement,
    );

    // No encryption mocks needed — server no longer encrypts/decrypts
  });

  describe("upload", () => {
    it("should upload a pre-encrypted file", async () => {
      const body = {
        name: "config.json",
        encryptedContent: Buffer.from("encrypted-data").toString("base64"),
        iv: "iv-base64",
        authTag: "tag-base64",
        mimeType: "application/json",
        fileSize: 100,
        vaultGroupId,
        description: "Config file",
      };
      const result = await service.upload(projectId, userId, body);

      expect(result.id).toBe(fileId);
      expect(result.name).toBe("config.json");
      expect(mockPrisma.secretFile.create).toHaveBeenCalled();
    });

    it("should reject executable file types", async () => {
      for (const ext of [".exe", ".sh", ".bat", ".cmd", ".ps1"]) {
        const body = {
          name: `script${ext}`,
          encryptedContent: "base64data",
          iv: "iv",
          authTag: "tag",
          mimeType: "application/octet-stream",
          fileSize: 100,
          vaultGroupId,
        };
        expect(service.upload(projectId, userId, body)).rejects.toBeInstanceOf(BadRequestError);
      }
    });

    it("should reject files with path traversal patterns", async () => {
      const body = {
        name: "../etc/passwd",
        encryptedContent: "base64data",
        iv: "iv",
        authTag: "tag",
        mimeType: "text/plain",
        fileSize: 100,
        vaultGroupId,
      };
      expect(service.upload(projectId, userId, body)).rejects.toBeInstanceOf(BadRequestError);
    });

    it("should store fileSize from body in the created record", async () => {
      const body = {
        name: "small.json",
        encryptedContent: Buffer.from("data").toString("base64"),
        iv: "iv",
        authTag: "tag",
        mimeType: "application/json",
        fileSize: 512,
        vaultGroupId,
      };
      await service.upload(projectId, userId, body);

      expect(mockPrisma.secretFile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ fileSize: 512 }),
        }),
      );
    });
  });

  describe("list", () => {
    it("should return file metadata without content", async () => {
      const result = await service.list(projectId);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.name).toBe("config.json");
      expect(mockPrisma.secretFile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { vaultGroup: true },
        }),
      );
    });

    it("should allow VIEWER to list files", async () => {
      const result = await service.list(projectId);

      expect(result.items).toHaveLength(1);
    });
  });

  describe("download", () => {
    it("should return encrypted content and metadata for OWNER", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce({
        ...mockSecretFile,
        vaultGroup: { id: vaultGroupId, name: "Default" },
      });

      const result = await service.download(projectId, fileId, userId);

      expect(result.name).toBe("config.json");
      expect(result.mimeType).toBe("application/json");
      expect(result.encryptedContent).toBeDefined();
      expect(result.iv).toBe("iv-base64");
      expect(result.authTag).toBe("tag-base64");
    });

    it("should throw NotFoundError when file doesn't exist", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(null);

      expect(service.download(projectId, fileId, userId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("delete", () => {
    it("should delete file and log audit", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(mockSecretFile);

      const result = await service.delete(projectId, fileId, userId);

      expect(result.message).toBe("Secret file deleted successfully");
      expect(mockPrisma.secretFile.delete).toHaveBeenCalledWith({ where: { id: fileId } });
    });

    it("should throw NotFoundError when file doesn't exist", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(null);

      expect(service.delete(projectId, fileId, userId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("update", () => {
    it("should update file name and description", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(mockSecretFile);
      mockPrisma.secretFile.update.mockResolvedValueOnce({
        ...mockSecretFile,
        name: "updated.json",
        description: "Updated desc",
      });

      const result = await service.update(projectId, fileId, {
        name: "updated.json",
        description: "Updated desc",
      });

      expect(result.name).toBe("updated.json");
      expect(result.description).toBe("Updated desc");
      expect(mockPrisma.secretFile.update).toHaveBeenCalledWith({
        where: { id: fileId },
        data: { name: "updated.json", description: "Updated desc" },
        include: { vaultGroup: true },
      });
    });

    it("should move file to a different vault group", async () => {
      const newVaultGroupId = "new-vault-group-id";
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(mockSecretFile);
      mockPrisma.secretFile.update.mockResolvedValueOnce({
        ...mockSecretFile,
        vaultGroupId: newVaultGroupId,
      });

      await service.update(projectId, fileId, { vaultGroupId: newVaultGroupId });

      expect(mockPrisma.secretFile.update).toHaveBeenCalledWith({
        where: { id: fileId },
        data: { vaultGroupId: newVaultGroupId },
        include: { vaultGroup: true },
      });
    });

    it("should reject path traversal in new name", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(mockSecretFile);

      expect(service.update(projectId, fileId, { name: "../etc/passwd" })).rejects.toBeInstanceOf(
        BadRequestError,
      );
    });

    it("should reject executable extension in new name", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(mockSecretFile);

      expect(service.update(projectId, fileId, { name: "script.exe" })).rejects.toBeInstanceOf(
        BadRequestError,
      );
    });

    it("should throw NotFoundError when file doesn't exist", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(null);

      expect(service.update(projectId, fileId, { name: "new.json" })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });
});
