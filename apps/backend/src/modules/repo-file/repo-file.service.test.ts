import "reflect-metadata";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { BadRequestError, NotFoundError } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma";
import { AppRepository } from "@/modules/app";
import { AuditLogService } from "@/modules/audit-log";
import { PlanEnforcementService } from "@/modules/subscription/plan-enforcement.service";
import type { DeepMockProxy } from "@/types/deep-mock";
import { RepoFileService } from "./repo-file.service";

const now = new Date();
const projectId = "project-uuid";
const userId = "user-uuid";
const fileId = "file-uuid";
const appId = "app-uuid";

const mockApp = { id: appId, name: "api", appPath: "services/api", projectId };

const mockRepoFile = {
  id: fileId,
  projectId,
  appId,
  kind: "CONFIG" as const,
  relativePath: ".env.local",
  environmentSlug: "production",
  format: "env",
  mimeType: null,
  description: null,
  encryptedContent: Buffer.from("encrypted-content"),
  iv: "iv-base64",
  authTag: "tag-base64",
  fileSize: 1024,
  isBinary: false,
  createdBy: userId,
  createdAt: now,
  updatedAt: now,
  app: { id: appId, name: "api", appPath: "services/api" },
};

function createMockPrisma() {
  return {
    repoFile: {
      create: mock(() => Promise.resolve(mockRepoFile)),
      findMany: mock(() => Promise.resolve([mockRepoFile])),
      findFirst: mock(() => Promise.resolve(null)),
      findUnique: mock(() => Promise.resolve(null)),
      count: mock(() => Promise.resolve(1)),
      update: mock(() => Promise.resolve(mockRepoFile)),
      delete: mock(() => Promise.resolve(mockRepoFile)),
    },
    repoFileVersion: {
      create: mock(() => Promise.resolve({})),
      findFirst: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
    },
  } as unknown as DeepMockProxy<PrismaClient>;
}

function createMockAppRepository(app = mockApp) {
  return {
    upsertByPath: mock(() => Promise.resolve(app)),
    requireApp: mock(() => Promise.resolve(app)),
  } as unknown as AppRepository;
}

function createService(prisma: DeepMockProxy<PrismaClient>, appRepo = createMockAppRepository()) {
  const mockAuditLog = { log: mock(() => Promise.resolve()) } as unknown as AuditLogService;
  const mockPlanEnforcement = {
    enforceForProject: mock(() => Promise.resolve()),
  } as unknown as PlanEnforcementService;
  return new RepoFileService(prisma, mockAuditLog, appRepo, mockPlanEnforcement);
}

function configPushBody(overrides: Record<string, unknown> = {}) {
  return {
    appPath: "services/api",
    appName: "api",
    kind: "CONFIG" as const,
    relativePath: ".env.local",
    environmentSlug: "production",
    format: "env",
    encryptedContent: Buffer.from("encrypted-data").toString("base64"),
    iv: "iv-base64",
    authTag: "tag-base64",
    fileSize: 100,
    isBinary: false,
    ...overrides,
  };
}

describe("RepoFileService", () => {
  let service: RepoFileService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mock.restore();
    mockPrisma = createMockPrisma();
    service = createService(mockPrisma);
  });

  describe("push", () => {
    it("should create a new CONFIG file", async () => {
      const result = await service.push(projectId, userId, configPushBody());

      expect(result.id).toBe(fileId);
      expect(result.kind).toBe("CONFIG");
      expect(result.relativePath).toBe(".env.local");
      expect(result.appName).toBe("api");
      expect(mockPrisma.repoFile.create).toHaveBeenCalled();
    });

    it("should create a new SECRET file with a mimeType", async () => {
      mockPrisma.repoFile.create.mockResolvedValueOnce({
        ...mockRepoFile,
        kind: "SECRET",
        format: null,
        mimeType: "application/x-pem-file",
        relativePath: "certs/key.pem",
      });

      const result = await service.push(
        projectId,
        userId,
        configPushBody({
          kind: "SECRET",
          relativePath: "certs/key.pem",
          format: null,
          mimeType: "application/x-pem-file",
        }),
      );

      expect(result.kind).toBe("SECRET");
      expect(result.mimeType).toBe("application/x-pem-file");
    });

    it("should snapshot a version and update when the file already exists", async () => {
      mockPrisma.repoFile.findUnique.mockResolvedValueOnce(mockRepoFile);

      await service.push(projectId, userId, configPushBody());

      expect(mockPrisma.repoFileVersion.create).toHaveBeenCalled();
      expect(mockPrisma.repoFile.update).toHaveBeenCalled();
      expect(mockPrisma.repoFile.create).not.toHaveBeenCalled();
    });

    it("should re-group the same file row under a new app without creating a duplicate", async () => {
      // File already exists under the old app; the marker layout changed so it now
      // resolves to a different app. Identity is (projectId, relativePath) → same row.
      mockPrisma.repoFile.findUnique.mockResolvedValueOnce({ ...mockRepoFile, appId: "old-app" });
      const newApp = { id: "new-app-uuid", name: "web", appPath: "apps/web", projectId };
      service = createService(mockPrisma, createMockAppRepository(newApp));

      await service.push(
        projectId,
        userId,
        configPushBody({ appPath: "apps/web", appName: "web" }),
      );

      expect(mockPrisma.repoFile.create).not.toHaveBeenCalled();
      expect(mockPrisma.repoFile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: fileId },
          data: expect.objectContaining({ appId: "new-app-uuid" }),
        }),
      );
    });

    it("should reject executable file types", async () => {
      for (const ext of [".exe", ".sh", ".bat", ".cmd", ".ps1"]) {
        const body = configPushBody({ kind: "SECRET", relativePath: `scripts/script${ext}` });
        expect(service.push(projectId, userId, body)).rejects.toBeInstanceOf(BadRequestError);
      }
    });

    it("should reject paths with traversal segments", async () => {
      const body = configPushBody({ relativePath: "../etc/passwd" });
      expect(service.push(projectId, userId, body)).rejects.toBeInstanceOf(BadRequestError);
    });

    it("should accept forward-slash nested relative paths", async () => {
      const body = configPushBody({ relativePath: "src/config/.env.local" });
      await service.push(projectId, userId, body);
      expect(mockPrisma.repoFile.create).toHaveBeenCalled();
    });

    it("should reject a CONFIG file larger than the 5 MB config cap", async () => {
      const body = configPushBody({ fileSize: 6 * 1024 * 1024 });
      expect(service.push(projectId, userId, body)).rejects.toBeInstanceOf(BadRequestError);
    });
  });

  describe("list", () => {
    it("should return file metadata filtered by project and include the app", async () => {
      const result = await service.list(projectId, { page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.kind).toBe("CONFIG");
      expect(mockPrisma.repoFile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId }),
          include: { app: { select: { id: true, name: true, appPath: true } } },
        }),
      );
    });
  });

  describe("getContent", () => {
    it("should return encrypted content and log a download", async () => {
      mockPrisma.repoFile.findFirst.mockResolvedValueOnce(mockRepoFile);

      const result = await service.getContent(projectId, fileId, userId);

      expect(result.encryptedContent).toBeDefined();
      expect(result.iv).toBe("iv-base64");
      expect(result.authTag).toBe("tag-base64");
    });

    it("should throw NotFoundError when the file does not exist", async () => {
      mockPrisma.repoFile.findFirst.mockResolvedValueOnce(null);

      expect(service.getContent(projectId, fileId, userId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("restoreVersion", () => {
    it("should snapshot the current content then restore the chosen version", async () => {
      mockPrisma.repoFile.findFirst.mockResolvedValueOnce(mockRepoFile);
      mockPrisma.repoFileVersion.findFirst.mockResolvedValueOnce({
        id: "version-uuid",
        repoFileId: fileId,
        encryptedContent: Buffer.from("old"),
        iv: "old-iv",
        authTag: "old-tag",
        fileSize: 50,
        isBinary: false,
        changedBy: userId,
        message: null,
        createdAt: now,
      });

      await service.restoreVersion(projectId, fileId, "version-uuid", userId);

      expect(mockPrisma.repoFileVersion.create).toHaveBeenCalled();
      expect(mockPrisma.repoFile.update).toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("should delete the file and log the audit event", async () => {
      mockPrisma.repoFile.findFirst.mockResolvedValueOnce(mockRepoFile);

      const result = await service.delete(projectId, fileId, userId);

      expect(result.message).toBe("File deleted successfully");
      expect(mockPrisma.repoFile.delete).toHaveBeenCalledWith({ where: { id: fileId } });
    });

    it("should throw NotFoundError when the file does not exist", async () => {
      mockPrisma.repoFile.findFirst.mockResolvedValueOnce(null);

      expect(service.delete(projectId, fileId, userId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("update", () => {
    it("should update description and environment metadata only", async () => {
      mockPrisma.repoFile.findFirst.mockResolvedValueOnce(mockRepoFile);
      mockPrisma.repoFile.update.mockResolvedValueOnce({
        ...mockRepoFile,
        description: "Updated desc",
        environmentSlug: "staging",
      });

      const result = await service.update(projectId, fileId, {
        description: "Updated desc",
        environmentSlug: "staging",
      });

      expect(result.description).toBe("Updated desc");
      expect(result.environmentSlug).toBe("staging");
    });
  });
});
