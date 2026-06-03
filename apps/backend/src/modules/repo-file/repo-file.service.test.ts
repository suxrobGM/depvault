import "reflect-metadata";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { BadRequestError, NotFoundError } from "@/common/errors";
import { AppRepository } from "@/modules/app";
import { AuditLogService } from "@/modules/audit-log";
import { PlanEnforcementService } from "@/modules/subscription/plan-enforcement.service";
import type { DeepMockProxy } from "@/types/deep-mock";
import { RepoFileRepository } from "./repo-file.repository";
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
  contentHash: null as string | null,
  createdBy: userId,
  createdAt: now,
  updatedAt: now,
  app: { id: appId, name: "api", appPath: "services/api" },
};

function createMockRepository() {
  return {
    findByPath: mock(() => Promise.resolve(null)),
    requireFile: mock(() => Promise.resolve(mockRepoFile)),
    create: mock(() => Promise.resolve(mockRepoFile)),
    update: mock(() => Promise.resolve(mockRepoFile)),
    delete: mock(() => Promise.resolve(mockRepoFile)),
    listWithCount: mock(() => Promise.resolve([[mockRepoFile], 1])),
    snapshotVersion: mock(() => Promise.resolve({})),
    listVersions: mock(() => Promise.resolve([])),
    requireVersion: mock(() => Promise.resolve(null)),
  } as unknown as DeepMockProxy<RepoFileRepository>;
}

function createMockAppRepository(app = mockApp) {
  return {
    upsertByPath: mock(() => Promise.resolve(app)),
    requireApp: mock(() => Promise.resolve(app)),
  } as unknown as AppRepository;
}

function createService(
  repository: ReturnType<typeof createMockRepository>,
  appRepo = createMockAppRepository(),
) {
  const mockAuditLog = { log: mock(() => Promise.resolve()) } as unknown as AuditLogService;
  const mockPlanEnforcement = {
    enforceForProject: mock(() => Promise.resolve()),
  } as unknown as PlanEnforcementService;
  return new RepoFileService(
    repository as unknown as RepoFileRepository,
    appRepo,
    mockAuditLog,
    mockPlanEnforcement,
  );
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
  let repository: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    mock.restore();
    repository = createMockRepository();
    service = createService(repository);
  });

  describe("push", () => {
    it("should create a new CONFIG file", async () => {
      const result = await service.push(projectId, userId, configPushBody());

      expect(result.id).toBe(fileId);
      expect(result.kind).toBe("CONFIG");
      expect(result.relativePath).toBe(".env.local");
      expect(result.appName).toBe("api");
      expect(repository.create).toHaveBeenCalled();
    });

    it("should create a new SECRET file with a mimeType", async () => {
      repository.create.mockResolvedValueOnce({
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
      repository.findByPath.mockResolvedValueOnce(mockRepoFile);

      await service.push(projectId, userId, configPushBody());

      expect(repository.snapshotVersion).toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it("should skip the version snapshot when the content hash is unchanged", async () => {
      repository.findByPath.mockResolvedValueOnce({ ...mockRepoFile, contentHash: "same-hash" });

      const result = await service.push(
        projectId,
        userId,
        configPushBody({ contentHash: "same-hash" }),
      );

      expect(result.id).toBe(fileId);
      expect(repository.snapshotVersion).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it("should snapshot a version when the content hash differs", async () => {
      repository.findByPath.mockResolvedValueOnce({ ...mockRepoFile, contentHash: "old-hash" });

      await service.push(projectId, userId, configPushBody({ contentHash: "new-hash" }));

      expect(repository.snapshotVersion).toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith(
        fileId,
        expect.objectContaining({ contentHash: "new-hash" }),
      );
    });

    it("should snapshot a version when the stored hash is null even if content matches", async () => {
      // Pre-existing rows (and rows touched by web save/restore) have a null hash; we can't prove
      // a no-op without it, so the push proceeds and backfills the hash.
      repository.findByPath.mockResolvedValueOnce({ ...mockRepoFile, contentHash: null });

      await service.push(projectId, userId, configPushBody({ contentHash: "some-hash" }));

      expect(repository.snapshotVersion).toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalled();
    });

    it("should re-group the same file row under a new app without creating a duplicate", async () => {
      // File already exists under the old app; the marker layout changed so it now
      // resolves to a different app. Identity is (projectId, relativePath) → same row.
      repository.findByPath.mockResolvedValueOnce({ ...mockRepoFile, appId: "old-app" });
      const newApp = { id: "new-app-uuid", name: "web", appPath: "apps/web", projectId };
      service = createService(repository, createMockAppRepository(newApp));

      await service.push(
        projectId,
        userId,
        configPushBody({ appPath: "apps/web", appName: "web" }),
      );

      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith(
        fileId,
        expect.objectContaining({ appId: "new-app-uuid" }),
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
      expect(repository.create).toHaveBeenCalled();
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
      expect(repository.listWithCount).toHaveBeenCalledWith(
        expect.objectContaining({ projectId }),
        0,
        20,
      );
    });
  });

  describe("getContent", () => {
    it("should return encrypted content and log a download", async () => {
      const result = await service.getContent(projectId, fileId, userId);

      expect(result.encryptedContent).toBeDefined();
      expect(result.iv).toBe("iv-base64");
      expect(result.authTag).toBe("tag-base64");
    });

    it("should throw NotFoundError when the file does not exist", async () => {
      repository.requireFile.mockRejectedValueOnce(new NotFoundError("File not found"));

      expect(service.getContent(projectId, fileId, userId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("restoreVersion", () => {
    it("should snapshot the current content then restore the chosen version", async () => {
      repository.requireVersion.mockResolvedValueOnce({
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

      expect(repository.snapshotVersion).toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith(
        fileId,
        expect.objectContaining({ contentHash: null }),
      );
    });
  });

  describe("delete", () => {
    it("should delete the file and log the audit event", async () => {
      const result = await service.delete(projectId, fileId, userId);

      expect(result.message).toBe("File deleted successfully");
      expect(repository.delete).toHaveBeenCalledWith(fileId);
    });

    it("should throw NotFoundError when the file does not exist", async () => {
      repository.requireFile.mockRejectedValueOnce(new NotFoundError("File not found"));

      expect(service.delete(projectId, fileId, userId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("update", () => {
    it("should update description and environment metadata only", async () => {
      repository.update.mockResolvedValueOnce({
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
