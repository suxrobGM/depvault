import "reflect-metadata";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/common/errors";
import * as encryption from "@/common/utils/encryption";
import { ProjectRole } from "@/generated/prisma";
import { SecretFileService } from "./secret-file.service";

const now = new Date();
const projectId = "project-uuid";
const userId = "user-uuid";
const envId = "env-uuid";
const fileId = "file-uuid";
const fakeProjectKey = Buffer.alloc(32, 1);
const fakeEncryptedContent = Buffer.from("encrypted-content");

const mockEnvironment = {
  id: envId,
  projectId,
  name: "development",
  type: "DEVELOPMENT",
  createdAt: now,
  updatedAt: now,
};

const mockSecretFile = {
  id: fileId,
  environmentId: envId,
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
    secretFile: {
      create: mock(() => Promise.resolve(mockSecretFile)),
      findMany: mock(() => Promise.resolve([mockSecretFile])),
      findFirst: mock(() => Promise.resolve(null)),
      count: mock(() => Promise.resolve(1)),
      update: mock(() => Promise.resolve(mockSecretFile)),
      delete: mock(() => Promise.resolve(mockSecretFile)),
    },
    secretFileAuditLog: {
      create: mock(() => Promise.resolve({})),
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
    mockPrisma = createMockPrisma();
    const mockNotificationService = { notify: mock(() => Promise.resolve()) } as any;
    service = new SecretFileService(
      mockPrisma,
      createMockAuditLogService(),
      mockNotificationService,
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
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: ProjectRole.OWNER });
      mockPrisma.environment.findUnique.mockResolvedValueOnce(mockEnvironment);

      const file = createMockFile("config.json");
      const result = await service.upload(
        projectId,
        userId,
        file,
        "vault-group-uuid",
        "development",
        "Config file",
      );

      expect(result.id).toBe(fileId);
      expect(result.name).toBe("config.json");
      expect(encryption.encryptBinary).toHaveBeenCalled();
      expect(mockPrisma.secretFile.create).toHaveBeenCalled();
      expect(mockPrisma.secretFileAuditLog.create).toHaveBeenCalledWith({
        data: { secretFileId: fileId, userId, action: "UPLOADED" },
      });
    });

    it("should reject executable file types", async () => {
      for (const ext of [".exe", ".sh", ".bat", ".cmd", ".ps1"]) {
        mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: ProjectRole.OWNER });
        const file = createMockFile(`script${ext}`);
        expect(
          service.upload(projectId, userId, file, "vault-group-uuid", "dev"),
        ).rejects.toBeInstanceOf(BadRequestError);
      }
    });

    it("should reject files with path traversal patterns", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: ProjectRole.OWNER });

      const file = createMockFile("../etc/passwd");
      expect(
        service.upload(projectId, userId, file, "vault-group-uuid", "dev"),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it("should reject files exceeding 25 MB", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: ProjectRole.OWNER });

      const file = createMockFile("big.json", 26 * 1024 * 1024);
      expect(
        service.upload(projectId, userId, file, "vault-group-uuid", "dev"),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it("should throw ForbiddenError for VIEWER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: ProjectRole.VIEWER });

      const file = createMockFile("config.json");
      expect(
        service.upload(projectId, userId, file, "vault-group-uuid", "dev"),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe("list", () => {
    it("should return file metadata without content", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: ProjectRole.VIEWER });

      const result = await service.list(projectId, userId, "development");

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.name).toBe("config.json");
      expect(mockPrisma.secretFile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            name: true,
          }),
        }),
      );
    });

    it("should filter by environment name", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: ProjectRole.OWNER });

      await service.list(projectId, userId, "staging", 1, 10);

      expect(mockPrisma.secretFile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { environment: { projectId, name: "staging" } },
        }),
      );
    });

    it("should allow VIEWER to list files", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: ProjectRole.VIEWER });

      const result = await service.list(projectId, userId);

      expect(result.items).toHaveLength(1);
    });
  });

  describe("download", () => {
    it("should download and decrypt file for OWNER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: ProjectRole.OWNER });
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(mockSecretFile);

      const result = await service.download(projectId, fileId, userId);

      expect(result.name).toBe("config.json");
      expect(result.mimeType).toBe("application/json");
      expect(encryption.decryptBinary).toHaveBeenCalled();
      expect(mockPrisma.secretFileAuditLog.create).toHaveBeenCalledWith({
        data: { secretFileId: fileId, userId, action: "DOWNLOADED" },
      });
    });

    it("should throw ForbiddenError for VIEWER download", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: ProjectRole.VIEWER });

      expect(service.download(projectId, fileId, userId)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("should throw NotFoundError when file doesn't exist", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: ProjectRole.OWNER });
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(null);

      expect(service.download(projectId, fileId, userId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("delete", () => {
    it("should delete file and log audit", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: ProjectRole.OWNER });
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(mockSecretFile);

      const result = await service.delete(projectId, fileId, userId);

      expect(result.message).toBe("Secret file deleted successfully");
      expect(mockPrisma.secretFile.delete).toHaveBeenCalledWith({ where: { id: fileId } });
      expect(mockPrisma.secretFileAuditLog.create).toHaveBeenCalledWith({
        data: { secretFileId: fileId, userId, action: "DELETED" },
      });
    });

    it("should throw ForbiddenError for VIEWER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: ProjectRole.VIEWER });

      expect(service.delete(projectId, fileId, userId)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("should throw NotFoundError when file doesn't exist", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: ProjectRole.OWNER });
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(null);

      expect(service.delete(projectId, fileId, userId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("update", () => {
    it("should update file name and description", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: ProjectRole.OWNER });
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(mockSecretFile);
      mockPrisma.secretFile.update.mockResolvedValueOnce({
        ...mockSecretFile,
        name: "updated.json",
        description: "Updated desc",
      });

      const result = await service.update(projectId, fileId, userId, {
        name: "updated.json",
        description: "Updated desc",
      });

      expect(result.name).toBe("updated.json");
      expect(result.description).toBe("Updated desc");
      expect(mockPrisma.secretFile.update).toHaveBeenCalledWith({
        where: { id: fileId },
        data: { name: "updated.json", description: "Updated desc" },
      });
    });

    it("should move file to a different environment", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: ProjectRole.EDITOR });
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(mockSecretFile);
      mockPrisma.environment.findUnique.mockResolvedValueOnce({
        ...mockEnvironment,
        id: "new-env-id",
        name: "staging",
      });
      mockPrisma.secretFile.update.mockResolvedValueOnce({
        ...mockSecretFile,
        environmentId: "new-env-id",
      });

      const vaultGroupId = "vault-group-uuid";
      await service.update(projectId, fileId, userId, { environment: "staging", vaultGroupId });

      expect(mockPrisma.secretFile.update).toHaveBeenCalledWith({
        where: { id: fileId },
        data: { environmentId: "new-env-id" },
      });
    });

    it("should reject path traversal in new name", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: ProjectRole.OWNER });
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(mockSecretFile);

      expect(
        service.update(projectId, fileId, userId, { name: "../etc/passwd" }),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it("should reject executable extension in new name", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: ProjectRole.OWNER });
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(mockSecretFile);

      expect(
        service.update(projectId, fileId, userId, { name: "script.exe" }),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it("should throw ForbiddenError for VIEWER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: ProjectRole.VIEWER });

      expect(
        service.update(projectId, fileId, userId, { name: "new.json" }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("should throw NotFoundError when file doesn't exist", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: ProjectRole.OWNER });
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(null);

      expect(
        service.update(projectId, fileId, userId, { name: "new.json" }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
