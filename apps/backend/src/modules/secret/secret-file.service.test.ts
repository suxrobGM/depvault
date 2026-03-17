import "reflect-metadata";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { BadRequestError, NotFoundError } from "@/common/errors";
import * as encryption from "@/common/utils/encryption";
import { ProjectRole } from "@/generated/prisma";
import { SecretFileService } from "./secret-file.service";

const now = new Date();
const projectId = "project-uuid";
const userId = "user-uuid";
const fileId = "file-uuid";
const fakeProjectKey = Buffer.alloc(32, 1);
const fakeEncryptedContent = Buffer.from("encrypted-content");

const vaultGroupId = "vault-group-uuid";

const mockVaultGroup = { id: vaultGroupId, name: "Default", projectId };

const mockSecretFile = {
  id: fileId,
  vaultGroupId,
  name: "config.json",
  description: "Config file",
  encryptedContent: fakeEncryptedContent,
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

function createMockFile(name: string, size = 1024, type = "application/json"): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
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

    spyOn(encryption, "deriveProjectKey").mockReturnValue(fakeProjectKey);
    spyOn(encryption, "encryptBinary").mockReturnValue({
      ciphertext: fakeEncryptedContent,
      iv: "iv-base64",
      authTag: "tag-base64",
    });
    spyOn(encryption, "decryptBinary").mockReturnValue(Buffer.from("decrypted-content"));
  });

  describe("upload", () => {
    it("should upload and encrypt a file", async () => {
      const file = createMockFile("config.json");
      const result = await service.upload(projectId, userId, file, vaultGroupId, "Config file");

      expect(result.id).toBe(fileId);
      expect(result.name).toBe("config.json");
      expect(encryption.encryptBinary).toHaveBeenCalled();
      expect(mockPrisma.secretFile.create).toHaveBeenCalled();
    });

    it("should reject executable file types", async () => {
      for (const ext of [".exe", ".sh", ".bat", ".cmd", ".ps1"]) {
        const file = createMockFile(`script${ext}`);
        expect(service.upload(projectId, userId, file, vaultGroupId)).rejects.toBeInstanceOf(
          BadRequestError,
        );
      }
    });

    it("should reject files with path traversal patterns", async () => {
      const file = createMockFile("../etc/passwd");
      expect(service.upload(projectId, userId, file, vaultGroupId)).rejects.toBeInstanceOf(
        BadRequestError,
      );
    });

    it("should reject files exceeding 25 MB", async () => {
      const file = createMockFile("big.json", 26 * 1024 * 1024);
      expect(service.upload(projectId, userId, file, vaultGroupId)).rejects.toBeInstanceOf(
        BadRequestError,
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
    it("should download and decrypt file for OWNER", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(mockSecretFile);

      const result = await service.download(projectId, fileId, userId);

      expect(result.name).toBe("config.json");
      expect(result.mimeType).toBe("application/json");
      expect(encryption.decryptBinary).toHaveBeenCalled();
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
