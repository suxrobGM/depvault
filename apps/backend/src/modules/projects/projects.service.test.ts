import "reflect-metadata";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { ForbiddenError, NotFoundError } from "@/common/errors";
import { ProjectsService } from "./projects.service";

const now = new Date();

const mockProject = {
  id: "project-uuid",
  name: "Test Project",
  description: "A test project",
  ownerId: "user-uuid",
  createdAt: now,
  updatedAt: now,
};

function createMockPrisma() {
  return {
    project: {
      create: mock(() => Promise.resolve(mockProject)),
      findMany: mock(() => Promise.resolve([mockProject])),
      findFirst: mock(() => Promise.resolve(null)),
      count: mock(() => Promise.resolve(1)),
      update: mock(() => Promise.resolve({ ...mockProject, name: "Updated" })),
      delete: mock(() => Promise.resolve(mockProject)),
    },
    projectMember: {
      findUnique: mock(() => Promise.resolve(null)),
    },
  } as any;
}

describe("ProjectsService", () => {
  let service: ProjectsService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new ProjectsService(mockPrisma);
  });

  describe("create", () => {
    it("should create a project and add user as OWNER member", async () => {
      const result = await service.create(
        { name: "Test Project", description: "A test project" },
        "user-uuid",
      );

      expect(result.id).toBe("project-uuid");
      expect(result.name).toBe("Test Project");
      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: {
          name: "Test Project",
          description: "A test project",
          ownerId: "user-uuid",
          members: {
            create: { userId: "user-uuid", role: "OWNER" },
          },
        },
      });
    });

    it("should create a project without description", async () => {
      await service.create({ name: "No Desc" }, "user-uuid");

      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: {
          name: "No Desc",
          description: undefined,
          ownerId: "user-uuid",
          members: {
            create: { userId: "user-uuid", role: "OWNER" },
          },
        },
      });
    });
  });

  describe("list", () => {
    it("should return paginated projects for the user", async () => {
      const result = await service.list("user-uuid", 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.name).toBe("Test Project");
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it("should filter by user membership", async () => {
      await service.list("user-uuid", 1, 10);

      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
        where: { members: { some: { userId: "user-uuid" } } },
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should calculate correct pagination for page 2", async () => {
      mockPrisma.project.count.mockResolvedValueOnce(25);
      mockPrisma.project.findMany.mockResolvedValueOnce([]);

      const result = await service.list("user-uuid", 2, 10);

      expect(result.pagination.totalPages).toBe(3);
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe("getById", () => {
    it("should return project when user is a member", async () => {
      mockPrisma.project.findFirst.mockResolvedValueOnce(mockProject);

      const result = await service.getById("project-uuid", "user-uuid");

      expect(result.id).toBe("project-uuid");
      expect(result.name).toBe("Test Project");
    });

    it("should throw NotFoundError when project does not exist", async () => {
      expect(service.getById("nonexistent", "user-uuid")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should throw NotFoundError when user is not a member", async () => {
      mockPrisma.project.findFirst.mockResolvedValueOnce(null);

      expect(service.getById("project-uuid", "other-user")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("update", () => {
    it("should update project when user is OWNER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        role: "OWNER",
      });

      const result = await service.update("project-uuid", { name: "Updated" }, "user-uuid");

      expect(result.name).toBe("Updated");
    });

    it("should update project when user is EDITOR", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        role: "EDITOR",
      });

      await service.update("project-uuid", { name: "Updated" }, "user-uuid");

      expect(mockPrisma.project.update).toHaveBeenCalled();
    });

    it("should throw NotFoundError when user is not a member", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(null);

      expect(
        service.update("project-uuid", { name: "Updated" }, "other-user"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should throw ForbiddenError when user is VIEWER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        role: "VIEWER",
      });

      expect(
        service.update("project-uuid", { name: "Updated" }, "user-uuid"),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("should only update provided fields", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        role: "OWNER",
      });

      await service.update("project-uuid", { name: "New Name" }, "user-uuid");

      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: "project-uuid" },
        data: { name: "New Name" },
      });
    });
  });

  describe("delete", () => {
    it("should delete project when user is OWNER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        role: "OWNER",
      });

      const result = await service.delete("project-uuid", "user-uuid");

      expect(result.message).toBe("Project deleted successfully");
      expect(mockPrisma.project.delete).toHaveBeenCalledWith({
        where: { id: "project-uuid" },
      });
    });

    it("should throw NotFoundError when user is not a member", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(null);

      expect(service.delete("project-uuid", "other-user")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should throw ForbiddenError when user is EDITOR", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        role: "EDITOR",
      });

      expect(service.delete("project-uuid", "user-uuid")).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("should throw ForbiddenError when user is VIEWER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        role: "VIEWER",
      });

      expect(service.delete("project-uuid", "user-uuid")).rejects.toBeInstanceOf(ForbiddenError);
    });
  });
});
