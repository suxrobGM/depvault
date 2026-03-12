import "reflect-metadata";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { ForbiddenError, NotFoundError } from "@/common/errors";
import { AuditLogService } from "./audit-log.service";

const now = new Date();
const projectId = "project-uuid";
const userId = "user-uuid";
const resourceId = "resource-uuid";

const mockAuditLog = {
  id: "audit-uuid",
  userId,
  projectId,
  action: "READ" as const,
  resourceType: "ENV_VARIABLE" as const,
  resourceId,
  ipAddress: "127.0.0.1",
  metadata: null,
  createdAt: now,
  user: { email: "test@test.com" },
};

function createMockPrisma() {
  return {
    auditLog: {
      create: mock(() => Promise.resolve(mockAuditLog)),
      findMany: mock(() => Promise.resolve([mockAuditLog])),
      count: mock(() => Promise.resolve(1)),
    },
    projectMember: {
      findUnique: mock(() => Promise.resolve(null)),
    },
  } as any;
}

describe("AuditLogService", () => {
  let service: AuditLogService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new AuditLogService(mockPrisma);
  });

  describe("log", () => {
    it("should create an audit log entry", async () => {
      await service.log({
        userId,
        projectId,
        action: "READ",
        resourceType: "ENV_VARIABLE",
        resourceId,
        ipAddress: "127.0.0.1",
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          projectId,
          action: "READ",
          resourceType: "ENV_VARIABLE",
          resourceId,
          ipAddress: "127.0.0.1",
        }),
      });
    });

    it("should not throw when creation fails", async () => {
      mockPrisma.auditLog.create.mockRejectedValueOnce(new Error("DB error"));

      await expect(
        service.log({
          userId,
          projectId,
          action: "READ",
          resourceType: "ENV_VARIABLE",
          resourceId,
          ipAddress: "127.0.0.1",
        }),
      ).resolves.toBeUndefined();
    });

    it("should accept optional metadata", async () => {
      await service.log({
        userId,
        projectId,
        action: "UPDATE",
        resourceType: "ENV_VARIABLE",
        resourceId,
        ipAddress: "192.168.1.1",
        metadata: { key: "DATABASE_URL" },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: { key: "DATABASE_URL" },
        }),
      });
    });
  });

  describe("list", () => {
    it("should return paginated audit logs for OWNER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });

      const result = await service.list(projectId, userId, {}, 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.id).toBe("audit-uuid");
      expect(result.items[0]!.userEmail).toBe("test@test.com");
      expect(result.pagination.total).toBe(1);
    });

    it("should return audit logs for EDITOR", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "EDITOR" });

      const result = await service.list(projectId, userId, {}, 1, 20);

      expect(result.items).toHaveLength(1);
    });

    it("should throw ForbiddenError for VIEWER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "VIEWER" });

      expect(service.list(projectId, userId, {}, 1, 20)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("should throw NotFoundError when user is not a member", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(null);

      expect(service.list(projectId, userId, {}, 1, 20)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should filter by action", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });

      await service.list(projectId, userId, { action: "DELETE" }, 1, 20);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: "DELETE" }),
        }),
      );
    });

    it("should filter by resourceType", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });

      await service.list(projectId, userId, { resourceType: "SECRET_FILE" }, 1, 20);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ resourceType: "SECRET_FILE" }),
        }),
      );
    });

    it("should filter by date range", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });

      const from = "2026-01-01T00:00:00.000Z";
      const to = "2026-01-31T23:59:59.999Z";

      await service.list(projectId, userId, { from, to }, 1, 20);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: new Date(from), lte: new Date(to) },
          }),
        }),
      );
    });

    it("should filter by start date only", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });

      const from = "2026-01-01T00:00:00.000Z";

      await service.list(projectId, userId, { from }, 1, 20);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: new Date(from) },
          }),
        }),
      );
    });

    it("should filter by userEmail with case-insensitive partial match", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });

      await service.list(projectId, userId, { userEmail: "test@" }, 1, 20);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: { email: { contains: "test@", mode: "insensitive" } },
          }),
        }),
      );
    });

    it("should include user email in response", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });

      const result = await service.list(projectId, userId, {}, 1, 20);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { user: { select: { email: true } } },
        }),
      );
      expect(result.items[0]!.userEmail).toBe("test@test.com");
    });
  });
});
