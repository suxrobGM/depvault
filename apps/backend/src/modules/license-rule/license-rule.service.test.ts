import "reflect-metadata";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { ConflictError, ForbiddenError, NotFoundError } from "@/common/errors";
import { LicenseRuleService } from "./license-rule.service";

const now = new Date();
const PROJECT_ID = "project-uuid";
const USER_ID = "user-uuid";
const RULE_ID = "rule-uuid";

const mockRule = {
  id: RULE_ID,
  projectId: PROJECT_ID,
  licenseId: "MIT",
  policy: "ALLOW",
  createdAt: now,
  updatedAt: now,
};

function createMockPrisma() {
  return {
    licenseRule: {
      findMany: mock(() => Promise.resolve([mockRule])),
      findUnique: mock(() => Promise.resolve(null)),
      findFirst: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve(mockRule)),
      update: mock(() => Promise.resolve(mockRule)),
      delete: mock(() => Promise.resolve(mockRule)),
    },
    projectMember: {
      findUnique: mock(() => Promise.resolve(null)),
    },
    dependency: {
      findMany: mock(() => Promise.resolve([])),
      count: mock(() => Promise.resolve(0)),
    },
  } as any;
}

function memberWith(role: string) {
  return { userId: USER_ID, projectId: PROJECT_ID, role };
}

describe("LicenseRuleService", () => {
  let service: LicenseRuleService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new LicenseRuleService(prisma);
  });

  // --- list ---

  describe("list", () => {
    it("should return all rules for the project", async () => {
      const result = await service.list(PROJECT_ID);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.licenseId).toBe("MIT");
      expect(prisma.licenseRule.findMany).toHaveBeenCalledWith({
        where: { projectId: PROJECT_ID },
        orderBy: { licenseId: "asc" },
      });
    });
  });

  // --- create ---

  describe("create", () => {
    it("should create a license rule", async () => {
      const result = await service.create(PROJECT_ID, {
        licenseId: "MIT",
        policy: "ALLOW" as any,
      });

      expect(result.id).toBe(RULE_ID);
      expect(prisma.licenseRule.create).toHaveBeenCalledWith({
        data: { projectId: PROJECT_ID, licenseId: "MIT", policy: "ALLOW" },
      });
    });

    it("should throw ConflictError when rule already exists", async () => {
      prisma.licenseRule.findUnique.mockResolvedValueOnce(mockRule);

      expect(
        service.create(PROJECT_ID, { licenseId: "MIT", policy: "ALLOW" as any }),
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  // --- update ---

  describe("update", () => {
    it("should update a rule policy", async () => {
      prisma.licenseRule.findFirst.mockResolvedValueOnce(mockRule);

      const result = await service.update(PROJECT_ID, RULE_ID, {
        policy: "BLOCK" as any,
      });

      expect(result.id).toBe(RULE_ID);
      expect(prisma.licenseRule.update).toHaveBeenCalledWith({
        where: { id: RULE_ID },
        data: { policy: "BLOCK" },
      });
    });

    it("should throw NotFoundError when rule does not exist", async () => {
      expect(
        service.update(PROJECT_ID, RULE_ID, { policy: "BLOCK" as any }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // --- delete ---

  describe("delete", () => {
    it("should delete a rule", async () => {
      prisma.licenseRule.findFirst.mockResolvedValueOnce(mockRule);

      const result = await service.delete(PROJECT_ID, RULE_ID);

      expect(result.message).toBe("License rule deleted successfully");
      expect(prisma.licenseRule.delete).toHaveBeenCalledWith({ where: { id: RULE_ID } });
    });

    it("should throw NotFoundError when rule does not exist", async () => {
      expect(service.delete(PROJECT_ID, RULE_ID)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // --- getComplianceSummary ---

  describe("getComplianceSummary", () => {
    const mockDeps = [
      { license: "MIT", licensePolicy: "ALLOW" },
      { license: "Apache-2.0", licensePolicy: "ALLOW" },
      { license: "GPL-3.0", licensePolicy: "BLOCK" },
      { license: "LGPL-2.1", licensePolicy: "WARN" },
      { license: null, licensePolicy: "ALLOW" },
    ];

    const mockPaginatedDeps = [
      {
        name: "express",
        license: "MIT",
        licensePolicy: "ALLOW",
        analysis: { fileName: "package.json" },
      },
      {
        name: "lodash",
        license: "Apache-2.0",
        licensePolicy: "ALLOW",
        analysis: { fileName: "package.json" },
      },
    ];

    it("should return correct compliance counts", async () => {
      prisma.dependency.findMany
        .mockResolvedValueOnce(mockDeps)
        .mockResolvedValueOnce(mockPaginatedDeps);
      prisma.dependency.count.mockResolvedValueOnce(5);

      const result = await service.getComplianceSummary(PROJECT_ID);

      expect(result.total).toBe(5);
      expect(result.allowed).toBe(2);
      expect(result.warned).toBe(1);
      expect(result.blocked).toBe(1);
      expect(result.unknown).toBe(1);
    });

    it("should return paginated dependencies", async () => {
      prisma.dependency.findMany
        .mockResolvedValueOnce(mockDeps)
        .mockResolvedValueOnce(mockPaginatedDeps);
      prisma.dependency.count.mockResolvedValueOnce(5);

      const result = await service.getComplianceSummary(PROJECT_ID, 1, 2);

      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies[0]!.name).toBe("express");
      expect(result.dependencies[0]!.analysisFileName).toBe("package.json");
      expect(result.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 5,
        totalPages: 3,
      });
    });

    it("should apply search filter to dependency query", async () => {
      prisma.dependency.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      prisma.dependency.count.mockResolvedValueOnce(0);

      await service.getComplianceSummary(PROJECT_ID, 1, 25, "express");

      const countCall = prisma.dependency.count.mock.calls[0]![0];
      expect(countCall.where).toHaveProperty("OR");
      expect(countCall.where.OR).toEqual([
        { name: { contains: "express", mode: "insensitive" } },
        { license: { contains: "express", mode: "insensitive" } },
      ]);
    });

    it("should not add search filter when search is empty", async () => {
      prisma.dependency.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      prisma.dependency.count.mockResolvedValueOnce(0);

      await service.getComplianceSummary(PROJECT_ID, 1, 25);

      const countCall = prisma.dependency.count.mock.calls[0]![0];
      expect(countCall.where).not.toHaveProperty("OR");
    });

    it("should calculate correct pagination for page 2", async () => {
      prisma.dependency.findMany.mockResolvedValueOnce(mockDeps).mockResolvedValueOnce([]);
      prisma.dependency.count.mockResolvedValueOnce(5);

      const result = await service.getComplianceSummary(PROJECT_ID, 2, 2);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 2,
        total: 5,
        totalPages: 3,
      });

      const paginatedCall = prisma.dependency.findMany.mock.calls[1]![0];
      expect(paginatedCall).toEqual(expect.objectContaining({ skip: 2, take: 2 }));
    });

    it("should handle zero dependencies", async () => {
      prisma.dependency.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      prisma.dependency.count.mockResolvedValueOnce(0);

      const result = await service.getComplianceSummary(PROJECT_ID);

      expect(result.total).toBe(0);
      expect(result.allowed).toBe(0);
      expect(result.warned).toBe(0);
      expect(result.blocked).toBe(0);
      expect(result.unknown).toBe(0);
      expect(result.dependencies).toEqual([]);
    });
  });

  // --- exportReport ---

  describe("exportReport", () => {
    beforeEach(() => {
      prisma.dependency.findMany
        .mockResolvedValue([{ license: "MIT", licensePolicy: "ALLOW" }])
        .mockResolvedValue([
          {
            name: "express",
            license: "MIT",
            licensePolicy: "ALLOW",
            analysis: { fileName: "package.json" },
          },
        ]);
      prisma.dependency.count.mockResolvedValue(1);
    });

    it("should generate CSV report", async () => {
      const result = await service.exportReport(PROJECT_ID, "csv");

      expect(result.contentType).toBe("text/csv");
      expect(result.fileName).toBe("license-audit-report.csv");
      expect(result.content).toContain("Dependency,License,Policy,Analysis File");
      expect(result.content).toContain("express");
      expect(result.content).toContain("Total Dependencies,1");
    });

    it("should generate text report for pdf format", async () => {
      const result = await service.exportReport(PROJECT_ID, "pdf");

      expect(result.contentType).toBe("text/plain");
      expect(result.fileName).toBe("license-audit-report.txt");
      expect(result.content).toContain("LICENSE AUDIT REPORT");
      expect(result.content).toContain("express");
      expect(result.content).toContain("Total Dependencies: 1");
    });

    it("should escape double quotes in CSV output", async () => {
      prisma.dependency.findMany
        .mockReset()
        .mockResolvedValueOnce([{ license: "MIT", licensePolicy: "ALLOW" }])
        .mockResolvedValueOnce([
          {
            name: 'pkg-with-"quotes"',
            license: "MIT",
            licensePolicy: "ALLOW",
            analysis: { fileName: "package.json" },
          },
        ]);

      const result = await service.exportReport(PROJECT_ID, "csv");

      expect(result.content).toContain('pkg-with-""quotes""');
    });
  });
});
