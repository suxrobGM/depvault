import "reflect-metadata";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/common/errors";
import { MemberService } from "./member.service";

const now = new Date();

const mockUser = {
  id: "invitee-uuid",
  email: "invitee@example.com",
  username: "invitee",
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
  user: { id: "invitee-uuid", email: "invitee@example.com", username: "invitee", avatarUrl: null },
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
    },
    project: {
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

describe("MemberService", () => {
  let service: MemberService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new MemberService(mockPrisma);
  });

  describe("invite", () => {
    it("should invite a user by email", async () => {
      mockPrisma.projectMember.findUnique
        .mockResolvedValueOnce(ownerMembership)
        .mockResolvedValueOnce(null);
      mockPrisma.user.findFirst.mockResolvedValueOnce(mockUser);

      const result = await service.invite(
        "project-uuid",
        { email: "invitee@example.com", role: "EDITOR" },
        "owner-uuid",
      );

      expect(result.userId).toBe("invitee-uuid");
      expect(result.role).toBe("EDITOR");
      expect(mockPrisma.projectMember.create).toHaveBeenCalledWith({
        data: { projectId: "project-uuid", userId: "invitee-uuid", role: "EDITOR" },
        include: expect.any(Object),
      });
    });

    it("should throw NotFoundError when invitee email not found", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(ownerMembership);
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);

      expect(
        service.invite(
          "project-uuid",
          { email: "unknown@example.com", role: "VIEWER" },
          "owner-uuid",
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should throw ForbiddenError when non-owner tries to invite", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        ...ownerMembership,
        role: "EDITOR",
      });

      expect(
        service.invite(
          "project-uuid",
          { email: "invitee@example.com", role: "VIEWER" },
          "editor-uuid",
        ),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("should throw BadRequestError when inviting yourself", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(ownerMembership);
      mockPrisma.user.findFirst.mockResolvedValueOnce({ ...mockUser, id: "owner-uuid" });

      expect(
        service.invite(
          "project-uuid",
          { email: "owner@example.com", role: "EDITOR" },
          "owner-uuid",
        ),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it("should throw ConflictError when user is already a member", async () => {
      mockPrisma.projectMember.findUnique
        .mockResolvedValueOnce(ownerMembership)
        .mockResolvedValueOnce(mockMember);
      mockPrisma.user.findFirst.mockResolvedValueOnce(mockUser);

      expect(
        service.invite(
          "project-uuid",
          { email: "invitee@example.com", role: "EDITOR" },
          "owner-uuid",
        ),
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe("list", () => {
    it("should return paginated members", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(ownerMembership);
      mockPrisma.projectMember.findMany.mockResolvedValueOnce([mockMember]);
      mockPrisma.projectMember.count.mockResolvedValueOnce(1);

      const result = await service.list("project-uuid", "owner-uuid", 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.userId).toBe("invitee-uuid");
      expect(result.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it("should throw NotFoundError when user is not a member", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(null);

      expect(service.list("project-uuid", "outsider", 1, 20)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should allow viewers to list members", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        ...ownerMembership,
        role: "VIEWER",
      });
      mockPrisma.projectMember.findMany.mockResolvedValueOnce([]);
      mockPrisma.projectMember.count.mockResolvedValueOnce(0);

      const result = await service.list("project-uuid", "viewer-uuid", 1, 20);

      expect(result.items).toHaveLength(0);
    });
  });

  describe("updateRole", () => {
    it("should update member role when owner", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(ownerMembership);
      mockPrisma.projectMember.findFirst.mockResolvedValueOnce({
        ...mockMember,
        role: "VIEWER",
      });
      mockPrisma.projectMember.update.mockResolvedValueOnce({
        ...mockMember,
        role: "EDITOR",
      });

      const result = await service.updateRole(
        "project-uuid",
        "member-uuid",
        { role: "EDITOR" },
        "owner-uuid",
      );

      expect(result.role).toBe("EDITOR");
    });

    it("should throw ForbiddenError when non-owner tries to update role", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        ...ownerMembership,
        role: "EDITOR",
      });

      expect(
        service.updateRole("project-uuid", "member-uuid", { role: "VIEWER" }, "editor-uuid"),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("should throw NotFoundError when target member not found", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(ownerMembership);
      mockPrisma.projectMember.findFirst.mockResolvedValueOnce(null);

      expect(
        service.updateRole("project-uuid", "nonexistent", { role: "EDITOR" }, "owner-uuid"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should throw ForbiddenError when trying to change owner role", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(ownerMembership);
      mockPrisma.projectMember.findFirst.mockResolvedValueOnce({
        ...ownerMembership,
        id: "other-owner-member",
        role: "OWNER",
      });

      expect(
        service.updateRole("project-uuid", "other-owner-member", { role: "EDITOR" }, "owner-uuid"),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe("remove", () => {
    it("should remove member when owner", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(ownerMembership);
      mockPrisma.projectMember.findFirst.mockResolvedValueOnce(mockMember);

      const result = await service.remove("project-uuid", "member-uuid", "owner-uuid");

      expect(result.message).toBe("Member removed successfully");
      expect(mockPrisma.projectMember.delete).toHaveBeenCalledWith({
        where: { id: "member-uuid" },
      });
    });

    it("should throw ForbiddenError when non-owner tries to remove", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        ...ownerMembership,
        role: "VIEWER",
      });

      expect(service.remove("project-uuid", "member-uuid", "viewer-uuid")).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it("should throw ForbiddenError when trying to remove owner", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(ownerMembership);
      mockPrisma.projectMember.findFirst.mockResolvedValueOnce({
        ...ownerMembership,
        role: "OWNER",
      });

      expect(
        service.remove("project-uuid", "owner-member-uuid", "owner-uuid"),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("should throw NotFoundError when target member not found", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(ownerMembership);
      mockPrisma.projectMember.findFirst.mockResolvedValueOnce(null);

      expect(service.remove("project-uuid", "nonexistent", "owner-uuid")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe("transferOwnership", () => {
    it("should transfer ownership to another member", async () => {
      mockPrisma.projectMember.findUnique
        .mockResolvedValueOnce(ownerMembership)
        .mockResolvedValueOnce({ ...mockMember, id: "new-owner-member-uuid" });

      const result = await service.transferOwnership(
        "project-uuid",
        { newOwnerId: "invitee-uuid" },
        "owner-uuid",
      );

      expect(result.message).toBe("Ownership transferred successfully");
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should throw BadRequestError when transferring to yourself", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(ownerMembership);

      expect(
        service.transferOwnership("project-uuid", { newOwnerId: "owner-uuid" }, "owner-uuid"),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it("should throw ForbiddenError when non-owner tries to transfer", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        ...ownerMembership,
        role: "EDITOR",
      });

      expect(
        service.transferOwnership("project-uuid", { newOwnerId: "invitee-uuid" }, "editor-uuid"),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("should throw NotFoundError when target is not a member", async () => {
      mockPrisma.projectMember.findUnique
        .mockResolvedValueOnce(ownerMembership)
        .mockResolvedValueOnce(null);

      expect(
        service.transferOwnership("project-uuid", { newOwnerId: "outsider-uuid" }, "owner-uuid"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
