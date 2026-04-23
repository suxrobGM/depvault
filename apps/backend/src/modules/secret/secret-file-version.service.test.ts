import "reflect-metadata";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { NotFoundError } from "@/common/errors";
import { SecretFileVersionService } from "./secret-file-version.service";

const now = new Date();
const projectId = "project-uuid";
const userId = "user-uuid";
const fileId = "file-uuid";
const versionId = "version-uuid";

const fakeEncryptedContent = Buffer.from("encrypted-content");

const vaultId = "vault-uuid";

const mockSecretFile = {
  id: fileId,
  vaultId,
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
  vault: { id: vaultId, name: "api-prod" },
};

const mockVersion = {
  id: versionId,
  secretFileId: fileId,
  encryptedContent: Buffer.from("old-encrypted"),
  iv: "old-iv",
  authTag: "old-tag",
  fileSize: 512,
  changedBy: userId,
  createdAt: now,
};

function createMockPrisma() {
  return {
    projectMember: {
      findUnique: mock(() => Promise.resolve(null)),
    },
    secretFile: {
      findFirst: mock(() => Promise.resolve(null)),
      update: mock(() => Promise.resolve(mockSecretFile)),
    },
    secretFileVersion: {
      create: mock(() => Promise.resolve({})),
      findMany: mock(() => Promise.resolve([mockVersion])),
      findFirst: mock(() => Promise.resolve(null)),
    },
  } as any;
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
        },
        include: { vault: true },
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
});
