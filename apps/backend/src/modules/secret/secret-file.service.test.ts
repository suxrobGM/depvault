import "reflect-metadata";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { BadRequestError, NotFoundError } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma";
import { AppRepository } from "@/modules/app";
import { AuditLogService } from "@/modules/audit-log";
import { NotificationService } from "@/modules/notification/notification.service";
import { PlanEnforcementService } from "@/modules/subscription/plan-enforcement.service";
import type { DeepMockProxy } from "@/types/deep-mock";
import { SecretFileService } from "./secret-file.service";

const now = new Date();
const projectId = "project-uuid";
const userId = "user-uuid";
const fileId = "file-uuid";
const appId = "app-uuid";

const mockApp = { id: appId, name: "api", appPath: "services/api", projectId };

const mockSecretFile = {
  id: fileId,
  appId,
  relativePath: ".env.local",
  environmentSlug: "production",
  description: "Config file",
  encryptedContent: Buffer.from("encrypted-content"),
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

function createMockPrisma() {
  return {
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
  } as unknown as DeepMockProxy<PrismaClient>;
}

function createMockAuditLogService() {
  return {
    log: mock(() => Promise.resolve()),
  } as unknown as AuditLogService;
}

function createMockAppRepository() {
  return {
    upsertByPath: mock(() => Promise.resolve(mockApp)),
    requireApp: mock(() => Promise.resolve(mockApp)),
  } as unknown as AppRepository;
}

function basePushBody() {
  return {
    appPath: "services/api",
    appName: "api",
    relativePath: ".env.local",
    environmentSlug: "production",
    encryptedContent: Buffer.from("encrypted-data").toString("base64"),
    iv: "iv-base64",
    authTag: "tag-base64",
    mimeType: "application/json",
    fileSize: 100,
    isBinary: false,
  };
}

describe("SecretFileService", () => {
  let service: SecretFileService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mock.restore();
    mockPrisma = createMockPrisma();
    const mockNotificationService = {
      notify: mock(() => Promise.resolve()),
    } as unknown as NotificationService;
    const mockPlanEnforcement = {
      enforceForProject: mock(() => Promise.resolve()),
    } as unknown as PlanEnforcementService;
    service = new SecretFileService(
      mockPrisma,
      createMockAuditLogService(),
      mockNotificationService,
      mockPlanEnforcement,
      createMockAppRepository(),
    );
  });

  describe("push", () => {
    it("should push a pre-encrypted file and create a new record", async () => {
      const result = await service.push(projectId, userId, basePushBody());

      expect(result.id).toBe(fileId);
      expect(result.relativePath).toBe(".env.local");
      expect(result.appName).toBe("api");
      expect(mockPrisma.secretFile.create).toHaveBeenCalled();
    });

    it("should snapshot a version and update when the file already exists", async () => {
      mockPrisma.secretFile.findUnique.mockResolvedValueOnce(mockSecretFile);

      await service.push(projectId, userId, basePushBody());

      expect(mockPrisma.secretFileVersion.create).toHaveBeenCalled();
      expect(mockPrisma.secretFile.update).toHaveBeenCalled();
      expect(mockPrisma.secretFile.create).not.toHaveBeenCalled();
    });

    it("should reject executable file types", async () => {
      for (const ext of [".exe", ".sh", ".bat", ".cmd", ".ps1"]) {
        const body = { ...basePushBody(), relativePath: `scripts/script${ext}` };
        expect(service.push(projectId, userId, body)).rejects.toBeInstanceOf(BadRequestError);
      }
    });

    it("should reject paths with traversal segments", async () => {
      const body = { ...basePushBody(), relativePath: "../etc/passwd" };
      expect(service.push(projectId, userId, body)).rejects.toBeInstanceOf(BadRequestError);
    });

    it("should accept forward-slash nested relative paths", async () => {
      const body = { ...basePushBody(), relativePath: "src/config/.env.local" };
      await service.push(projectId, userId, body);
      expect(mockPrisma.secretFile.create).toHaveBeenCalled();
    });

    it("should store fileSize from body in the created record", async () => {
      const body = { ...basePushBody(), fileSize: 512 };
      await service.push(projectId, userId, body);

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
      expect(result.items[0]!.relativePath).toBe(".env.local");
      expect(mockPrisma.secretFile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { app: { select: { id: true, name: true, appPath: true } } },
        }),
      );
    });
  });

  describe("download", () => {
    it("should return encrypted content and metadata", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(mockSecretFile);

      const result = await service.download(projectId, fileId, userId);

      expect(result.relativePath).toBe(".env.local");
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
    it("should update description and environment metadata only", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(mockSecretFile);
      mockPrisma.secretFile.update.mockResolvedValueOnce({
        ...mockSecretFile,
        description: "Updated desc",
        environmentSlug: "staging",
      });

      const result = await service.update(projectId, fileId, {
        description: "Updated desc",
        environmentSlug: "staging",
      });

      expect(result.description).toBe("Updated desc");
      expect(result.environmentSlug).toBe("staging");
      expect(mockPrisma.secretFile.update).toHaveBeenCalledWith({
        where: { id: fileId },
        data: { description: "Updated desc", environmentSlug: "staging" },
        include: { app: { select: { id: true, name: true, appPath: true } } },
      });
    });

    it("should throw NotFoundError when file doesn't exist", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(null);

      expect(service.update(projectId, fileId, { description: "x" })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });
});
