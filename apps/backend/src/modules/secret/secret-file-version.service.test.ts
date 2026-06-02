import "reflect-metadata";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { NotFoundError } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma";
import type { DeepMockProxy } from "@/types/deep-mock";
import { SecretFileVersionService } from "./secret-file-version.service";

const now = new Date();
const projectId = "project-uuid";
const userId = "user-uuid";
const fileId = "file-uuid";
const versionId = "version-uuid";
const appId = "app-uuid";

const fakeEncryptedContent = Buffer.from("encrypted-content");

const mockSecretFile = {
  id: fileId,
  appId,
  relativePath: ".env.local",
  environmentSlug: "production",
  description: "Config file",
  encryptedContent: fakeEncryptedContent,
  iv: "iv-base64",
  authTag: "tag-base64",
  mimeType: "application/json",
  fileSize: 1024,
  isBinary: false,
  uploadedBy: userId,
  createdAt: now,
  updatedAt: now,
  app: { id: appId, name: "api", appPath: "services/api" },
};

const mockVersion = {
  id: versionId,
  secretFileId: fileId,
  encryptedContent: Buffer.from("old-encrypted"),
  iv: "old-iv",
  authTag: "old-tag",
  fileSize: 512,
  isBinary: false,
  changedBy: userId,
  message: null,
  createdAt: now,
};

function createMockPrisma() {
  return {
    secretFile: {
      findFirst: mock(() => Promise.resolve(null)),
      update: mock(() => Promise.resolve(mockSecretFile)),
    },
    secretFileVersion: {
      create: mock(() => Promise.resolve({})),
      findMany: mock(() => Promise.resolve([mockVersion])),
      findFirst: mock(() => Promise.resolve(null)),
    },
  } as unknown as DeepMockProxy<PrismaClient>;
}

describe("SecretFileVersionService", () => {
  let service: SecretFileVersionService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new SecretFileVersionService(mockPrisma);
  });

  describe("listVersions", () => {
    it("should list versions for any project member", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(mockSecretFile);

      const result = await service.listVersions(projectId, fileId);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.id).toBe(versionId);
    });

    it("should throw NotFoundError when file doesn't exist", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(null);

      expect(service.listVersions(projectId, fileId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("rollback", () => {
    it("should rollback to previous version and save current as version", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(mockSecretFile);
      mockPrisma.secretFileVersion.findFirst.mockResolvedValueOnce(mockVersion);

      await service.rollback(projectId, fileId, versionId, userId);

      expect(mockPrisma.secretFileVersion.create).toHaveBeenCalledWith({
        data: {
          secretFileId: fileId,
          encryptedContent: mockSecretFile.encryptedContent,
          iv: mockSecretFile.iv,
          authTag: mockSecretFile.authTag,
          fileSize: mockSecretFile.fileSize,
          isBinary: mockSecretFile.isBinary,
          changedBy: userId,
        },
      });
      expect(mockPrisma.secretFile.update).toHaveBeenCalledWith({
        where: { id: fileId },
        data: {
          encryptedContent: mockVersion.encryptedContent,
          iv: mockVersion.iv,
          authTag: mockVersion.authTag,
          fileSize: mockVersion.fileSize,
          isBinary: mockVersion.isBinary,
        },
        include: { app: { select: { id: true, name: true, appPath: true } } },
      });
    });

    it("should throw NotFoundError when version doesn't exist", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(mockSecretFile);
      mockPrisma.secretFileVersion.findFirst.mockResolvedValueOnce(null);

      expect(service.rollback(projectId, fileId, versionId, userId)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe("downloadVersion", () => {
    it("should return previous-version content with file metadata", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(mockSecretFile);
      mockPrisma.secretFileVersion.findFirst.mockResolvedValueOnce(mockVersion);

      const result = await service.downloadVersion(projectId, fileId, versionId);

      expect(result.relativePath).toBe(".env.local");
      expect(result.mimeType).toBe("application/json");
      expect(result.iv).toBe("old-iv");
      expect(result.authTag).toBe("old-tag");
    });

    it("should throw NotFoundError when version doesn't exist", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(mockSecretFile);
      mockPrisma.secretFileVersion.findFirst.mockResolvedValueOnce(null);

      expect(service.downloadVersion(projectId, fileId, versionId)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });
});
