import "reflect-metadata";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from "@/common/errors";
import { PrismaClient, type CiToken } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import { PlanEnforcementService } from "@/modules/subscription/plan-enforcement.service";
import type { DeepMockProxy } from "@/types/deep-mock";
import { CiTokenService } from "./ci-token.service";

mock.module("@/common/logger/logger", () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {} },
}));

const mockDekBytes = new Uint8Array(32);
mock.module("@depvault/crypto", () => ({
  deriveCIWrapKey: mock(() => Promise.resolve({})),
  unwrapKey: mock(() => Promise.resolve(mockDekBytes)),
  wrapKey: mock(() =>
    Promise.resolve({ wrapped: "rewrapped-dek", iv: "rewrapped-iv", tag: "rewrapped-tag" }),
  ),
}));

const baseProjectMember = {
  id: "member-uuid",
  projectId: "project-uuid",
  userId: "user-uuid",
  role: "OWNER",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseApp = {
  id: "app-uuid",
  projectId: "project-uuid",
  name: "Logistics.API",
  appPath: "src/Presentation/Logistics.API",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseCiToken = {
  id: "token-uuid",
  projectId: "project-uuid",
  appId: "app-uuid",
  environmentSlug: "prod",
  createdBy: "user-uuid",
  name: "GitHub Actions Prod",
  tokenHash: "hash",
  tokenPrefix: "abcd1234",
  ipAllowlist: [],
  wrappedDek: "wrapped-dek",
  wrappedDekIv: "wrapped-iv",
  wrappedDekTag: "wrapped-tag",
  revokedAt: null,
  lastUsedAt: null,
  expiresAt: new Date(Date.now() + 86400_000),
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createMockPrisma() {
  return {
    projectMember: {
      findUnique: mock(() => Promise.resolve({ ...baseProjectMember })),
    },
    app: {
      findFirst: mock(() => Promise.resolve({ ...baseApp })),
    },
    ciToken: {
      create: mock(() => Promise.resolve({ ...baseCiToken })),
      findMany: mock(() => Promise.resolve([])),
      findFirst: mock(() => Promise.resolve({ ...baseCiToken })),
      findUnique: mock(() => Promise.resolve({ ...baseCiToken })),
      update: mock(() => Promise.resolve({ ...baseCiToken })),
      delete: mock(() => Promise.resolve({ ...baseCiToken })),
      count: mock(() => Promise.resolve(0)),
    },
    configFile: {
      findMany: mock(() => Promise.resolve([])),
    },
    secretFile: {
      findMany: mock(() => Promise.resolve([])),
      findFirst: mock(() => Promise.resolve(null)),
    },
  } as unknown as DeepMockProxy<PrismaClient>;
}

function createMockAuditLogService() {
  return {
    log: mock(() => Promise.resolve()),
  } as unknown as AuditLogService;
}

let mockPrisma: ReturnType<typeof createMockPrisma>;
let mockAudit: ReturnType<typeof createMockAuditLogService>;
let service: CiTokenService;

beforeEach(() => {
  mockPrisma = createMockPrisma();
  mockAudit = createMockAuditLogService();
  const mockPlanEnforcement = {
    enforceForProject: mock(() => Promise.resolve()),
    enforceFeatureForProject: mock(() => Promise.resolve()),
  } as unknown as PlanEnforcementService;
  service = new CiTokenService(mockPrisma, mockAudit, mockPlanEnforcement);
});

describe("CiTokenService", () => {
  describe("create", () => {
    const body = {
      name: "GitHub Actions Prod",
      appId: "app-uuid",
      environmentSlug: "prod",
      wrappedDek: "wrapped-dek",
      wrappedDekIv: "wrapped-iv",
      wrappedDekTag: "wrapped-tag",
      wrapPlaceholder: "placeholder",
      expiresIn: 86400,
    };

    it("should create a token and return plaintext", async () => {
      const result = await service.create("project-uuid", "user-uuid", body, "127.0.0.1");

      expect(result.token).toStartWith("dvci_");
      expect(result.tokenPrefix).toHaveLength(8);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockPrisma.ciToken.create).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalled();
    });

    it("should throw NotFoundError when app not in project", async () => {
      mockPrisma.app.findFirst.mockResolvedValueOnce(null);

      expect(service.create("project-uuid", "user-uuid", body, "127.0.0.1")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("should throw BadRequestError for invalid IP allowlist", async () => {
      expect(
        service.create(
          "project-uuid",
          "user-uuid",
          { ...body, ipAllowlist: ["not-an-ip"] },
          "127.0.0.1",
        ),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it("should throw BadRequestError when expiresIn exceeds 1 year", async () => {
      expect(
        service.create("project-uuid", "user-uuid", { ...body, expiresIn: 31536001 }, "127.0.0.1"),
      ).rejects.toBeInstanceOf(BadRequestError);
    });
  });

  describe("list", () => {
    it("should return paginated token list scoped to app + environment", async () => {
      const tokenWithRelations = {
        ...baseCiToken,
        creator: { email: "user@test.com" },
        app: { name: "Logistics.API" },
      };
      mockPrisma.ciToken.findMany.mockResolvedValueOnce([tokenWithRelations]);
      mockPrisma.ciToken.count.mockResolvedValueOnce(1);

      const result = await service.list("project-uuid");

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.appName).toBe("Logistics.API");
      expect(result.items[0]!.environmentSlug).toBe("prod");
      expect(result.pagination.total).toBe(1);
    });
  });

  describe("revoke", () => {
    it("should delete the token", async () => {
      const result = await service.revoke("project-uuid", "token-uuid", "user-uuid", "127.0.0.1");

      expect(result.message).toBe("CI token deleted");
      expect(mockPrisma.ciToken.delete).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalled();
    });

    it("should throw NotFoundError when token not found", async () => {
      mockPrisma.ciToken.findFirst.mockResolvedValueOnce(null);

      expect(
        service.revoke("project-uuid", "token-uuid", "user-uuid", "127.0.0.1"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("validateToken", () => {
    it("should return token when valid", async () => {
      const result = await service.validateToken("dvci_sometoken", "127.0.0.1");

      expect(result.id).toBe("token-uuid");
      expect(mockPrisma.ciToken.update).toHaveBeenCalled();
    });

    it("should throw UnauthorizedError when token not found", async () => {
      mockPrisma.ciToken.findUnique.mockResolvedValueOnce(null);

      expect(service.validateToken("dvci_bad", "127.0.0.1")).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });

    it("should throw UnauthorizedError when token is expired", async () => {
      mockPrisma.ciToken.findUnique.mockResolvedValueOnce({
        ...baseCiToken,
        expiresAt: new Date(Date.now() - 1000),
      });

      expect(service.validateToken("dvci_expired", "127.0.0.1")).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });

    it("should throw ForbiddenError when IP not in allowlist", async () => {
      mockPrisma.ciToken.findUnique.mockResolvedValueOnce({
        ...baseCiToken,
        ipAllowlist: ["10.0.0.1"],
      });

      expect(service.validateToken("dvci_token", "192.168.1.1")).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it("should allow IP in allowlist", async () => {
      mockPrisma.ciToken.findUnique.mockResolvedValueOnce({
        ...baseCiToken,
        ipAllowlist: ["10.0.0.0/8"],
      });

      const result = await service.validateToken("dvci_token", "10.1.2.3");
      expect(result.id).toBe("token-uuid");
    });
  });

  describe("fetchSecrets", () => {
    it("should return base + environment config and secret files", async () => {
      mockPrisma.configFile.findMany.mockResolvedValueOnce([
        {
          id: "cfg-1",
          appId: "app-uuid",
          relativePath: "src/Presentation/Logistics.API/appsettings.Production.json",
          format: "appsettings.json",
          environmentSlug: "prod",
          encryptedContent: Buffer.from("enc"),
          iv: "civ",
          authTag: "ctag",
          isBinary: false,
        },
      ]);
      mockPrisma.secretFile.findMany.mockResolvedValueOnce([
        {
          id: "file-1",
          appId: "app-uuid",
          relativePath: "src/Presentation/Logistics.API/signing.pfx",
          environmentSlug: null,
          mimeType: "application/x-pkcs12",
          encryptedContent: Buffer.from("enc"),
          iv: "fiv",
          authTag: "ftag",
          isBinary: true,
        },
      ]);

      const result = await service.fetchSecrets(
        baseCiToken as unknown as CiToken,
        "dvci_raw",
        "run-123",
        "127.0.0.1",
      );

      expect(result.configFiles).toHaveLength(1);
      expect(result.configFiles[0]!.relativePath).toContain("appsettings.Production.json");
      expect(result.configFiles[0]!.encryptedContent).toBeDefined();
      expect(result.secretFiles).toHaveLength(1);
      expect(result.secretFiles[0]!.relativePath).toContain("signing.pfx");
      expect(result.secretFiles[0]!.iv).toBe("fiv");
      expect(result.wrappedDek).toBe("wrapped-dek");
      expect(mockAudit.log).toHaveBeenCalled();
    });
  });

  describe("downloadFile", () => {
    it("should return the encrypted secret file by relative path", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce({
        id: "file-1",
        appId: "app-uuid",
        relativePath: "config/app.pfx",
        mimeType: "application/x-pkcs12",
        encryptedContent: Buffer.from("encrypted"),
        iv: "iv",
        authTag: "tag",
      });

      const result = await service.downloadFile(baseCiToken as unknown as CiToken, "file-1");

      expect(result.relativePath).toBe("config/app.pfx");
      expect(result.mimeType).toBe("application/x-pkcs12");
      expect(result.encryptedContent).toBeDefined();
    });

    it("should throw NotFoundError when file not in app", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(null);

      expect(
        service.downloadFile(baseCiToken as unknown as CiToken, "bad-id"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
