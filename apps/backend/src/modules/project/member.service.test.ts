import "reflect-metadata";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/common/errors";
import { MemberService } from "./member.service";

const now = new Date();

const mockUser = {
  id: "invitee-uuid",
  email: "invitee@example.com",
  firstName: "Invitee",
  lastName: "User",
  avatarUrl: null,
  deletedAt: null,
};

const mockMember = {
  id: "member-uuid",
  projectId: "project-uuid",
  userId: "invitee-uuid",
  role: "EDITOR",
  createdAt: now,
  updatedAt: now,
  user: {
    id: "invitee-uuid",
    email: "invitee@example.com",
    firstName: "Invitee",
    lastName: "User",
    avatarUrl: null,
  },
};

const ownerMembership = {
  id: "owner-member-uuid",
  projectId: "project-uuid",
  userId: "owner-uuid",
  role: "OWNER",
  createdAt: now,
  updatedAt: now,
};

function createMockPrisma() {
  return {
    user: {
      findFirst: mock(() => Promise.resolve(null)),
      findUnique: mock(() => Promise.resolve(null)),
    },
    project: {
      findUnique: mock(() => Promise.resolve({ name: "Test Project" })),
      update: mock(() => Promise.resolve({})),
    },
    projectMember: {
      findUnique: mock(() => Promise.resolve(null)),
      findFirst: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve(mockMember)),
      update: mock(() => Promise.resolve(mockMember)),
      delete: mock(() => Promise.resolve(mockMember)),
      count: mock(() => Promise.resolve(0)),
    },
    $transaction: mock((ops: Promise<unknown>[]) => Promise.all(ops)),
  } as any;
}

function createMockEmailService() {
  return { send: mock(() => Promise.resolve()) } as any;
}

function createMockNotificationService() {
  return { notify: mock(() => Promise.resolve()) } as any;
}

describe("MemberService", () => {
  let service: MemberService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockEmailService: ReturnType<typeof createMockEmailService>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockEmailService = createMockEmailService();
    service = new MemberService(mockPrisma, mockEmailService, createMockNotificationService());
  });

  describe("list", () => {
    it("should return paginated members", async () => {
      mockPrisma.projectMember.findMany.mockResolvedValueOnce([mockMember]);
      mockPrisma.projectMember.count.mockResolvedValueOnce(1);

      const result = await service.list("project-uuid", 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.userId).toBe("invitee-uuid");
      expect(result.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it("should allow viewers to list members", async () => {
      mockPrisma.projectMember.findMany.mockResolvedValueOnce([]);
      mockPrisma.projectMember.count.mockResolvedValueOnce(0);

      const result = await service.list("project-uuid", 1, 20);

      expect(result.items).toHaveLength(0);
    });
  });

  describe("updateRole", () => {
    it("should update member role when owner", async () => {
      mockPrisma.projectMember.findFirst.mockResolvedValueOnce({
        ...mockMember,
        role: "VIEWER",
      });
      mockPrisma.projectMember.update.mockResolvedValueOnce({
        ...mockMember,
        role: "EDITOR",
      });

      const result = await service.updateRole("project-uuid", "member-uuid", { role: "EDITOR" });

      expect(result.role).toBe("EDITOR");
    });

    it("should throw NotFoundError when target member not found", async () => {
      mockPrisma.projectMember.findFirst.mockResolvedValueOnce(null);

      expect(
        service.updateRole("project-uuid", "nonexistent", { role: "EDITOR" }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should throw ForbiddenError when trying to change owner role", async () => {
      mockPrisma.projectMember.findFirst.mockResolvedValueOnce({
        ...ownerMembership,
        id: "other-owner-member",
        role: "OWNER",
      });

      expect(
        service.updateRole("project-uuid", "other-owner-member", { role: "EDITOR" }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe("remove", () => {
    it("should remove member when owner", async () => {
      mockPrisma.projectMember.findFirst.mockResolvedValueOnce(mockMember);

      const result = await service.remove("project-uuid", "member-uuid");

      expect(result.message).toBe("Member removed successfully");
      expect(mockPrisma.projectMember.delete).toHaveBeenCalledWith({
        where: { id: "member-uuid" },
      });
    });

    it("should throw ForbiddenError when trying to remove owner", async () => {
      mockPrisma.projectMember.findFirst.mockResolvedValueOnce({
        ...ownerMembership,
        role: "OWNER",
      });

      expect(service.remove("project-uuid", "owner-member-uuid")).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it("should throw NotFoundError when target member not found", async () => {
      mockPrisma.projectMember.findFirst.mockResolvedValueOnce(null);

      expect(service.remove("project-uuid", "nonexistent")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("transferOwnership", () => {
    it("should transfer ownership to another member", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        ...mockMember,
        id: "new-owner-member-uuid",
      });

      const result = await service.transferOwnership(
        "project-uuid",
        { newOwnerId: "invitee-uuid" },
        "owner-member-uuid",
        "owner-uuid",
      );

      expect(result.message).toBe("Ownership transferred successfully");
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should throw BadRequestError when transferring to yourself", async () => {
      expect(
        service.transferOwnership(
          "project-uuid",
          { newOwnerId: "owner-uuid" },
          "owner-member-uuid",
          "owner-uuid",
        ),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it("should throw NotFoundError when target is not a member", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(null);

      expect(
        service.transferOwnership(
          "project-uuid",
          { newOwnerId: "outsider-uuid" },
          "owner-member-uuid",
          "owner-uuid",
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
