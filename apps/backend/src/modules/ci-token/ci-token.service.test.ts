import "reflect-metadata";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from "@/common/errors";
import { CiTokenService } from "./ci-token.service";

mock.module("@/common/utils/encryption", () => ({
  deriveProjectKey: () => Buffer.alloc(32),
  decrypt: (_c: string, _iv: string, _a: string, _k: Buffer) => "decrypted-value",
  decryptBinary: (_c: Buffer, _iv: string, _a: string, _k: Buffer) => Buffer.from("file-data"),
}));

mock.module("@/common/logger/logger", () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {} },
}));

const baseProjectMember = {
  id: "member-uuid",
  projectId: "project-uuid",
  userId: "user-uuid",
  role: "OWNER",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseEnvironment = {
  id: "env-uuid",
  projectId: "project-uuid",
  vaultGroupId: "vg-uuid",
  type: "PRODUCTION",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseCiToken = {
  id: "token-uuid",
  projectId: "project-uuid",
  environmentId: "env-uuid",
  createdBy: "user-uuid",
  name: "GitHub Actions Prod",
  tokenHash: "hash",
  tokenPrefix: "abcd1234",
  ipAllowlist: [],
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
    environment: {
      findFirst: mock(() => Promise.resolve({ ...baseEnvironment })),
    },
    ciToken: {
      create: mock(() => Promise.resolve({ ...baseCiToken })),
      findMany: mock(() => Promise.resolve([])),
      findFirst: mock(() => Promise.resolve({ ...baseCiToken })),
      findUnique: mock(() => Promise.resolve({ ...baseCiToken })),
      update: mock(() => Promise.resolve({ ...baseCiToken })),
      count: mock(() => Promise.resolve(0)),
    },
    envVariable: {
      findMany: mock(() => Promise.resolve([])),
    },
    secretFile: {
      findMany: mock(() => Promise.resolve([])),
      findFirst: mock(() => Promise.resolve(null)),
    },
  } as any;
}

function createMockAuditLogService() {
  return {
    log: mock(() => Promise.resolve()),
  } as any;
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
  } as any;
  service = new CiTokenService(mockPrisma, mockAudit, mockPlanEnforcement);
});

describe("CiTokenService", () => {
  describe("create", () => {
    const body = {
      name: "GitHub Actions Prod",
      environmentId: "env-uuid",
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

    it("should throw NotFoundError when environment not in project", async () => {
      mockPrisma.environment.findFirst.mockResolvedValueOnce(null);

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
    it("should return paginated token list", async () => {
      const tokenWithRelations = {
        ...baseCiToken,
        creator: { email: "user@test.com" },
        environment: {
          type: "PRODUCTION",
          vaultGroup: { name: "Default" },
        },
      };
      mockPrisma.ciToken.findMany.mockResolvedValueOnce([tokenWithRelations]);
      mockPrisma.ciToken.count.mockResolvedValueOnce(1);

      const result = await service.list("project-uuid");

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.environmentLabel).toBe("Default / PRODUCTION");
      expect(result.pagination.total).toBe(1);
    });
  });

  describe("revoke", () => {
    it("should revoke an active token", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ ...baseProjectMember });
      const result = await service.revoke("project-uuid", "token-uuid", "user-uuid", "127.0.0.1");

      expect(result.message).toBe("CI token revoked");
      expect(mockPrisma.ciToken.update).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalled();
    });

    it("should throw NotFoundError when token not found", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ ...baseProjectMember });
      mockPrisma.ciToken.findFirst.mockResolvedValueOnce(null);

      expect(
        service.revoke("project-uuid", "token-uuid", "user-uuid", "127.0.0.1"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should throw BadRequestError when token already revoked", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ ...baseProjectMember });
      mockPrisma.ciToken.findFirst.mockResolvedValueOnce({
        ...baseCiToken,
        revokedAt: new Date(),
      });

      expect(
        service.revoke("project-uuid", "token-uuid", "user-uuid", "127.0.0.1"),
      ).rejects.toBeInstanceOf(BadRequestError);
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

    it("should throw UnauthorizedError when token is revoked", async () => {
      mockPrisma.ciToken.findUnique.mockResolvedValueOnce({
        ...baseCiToken,
        revokedAt: new Date(),
      });

      expect(service.validateToken("dvci_revoked", "127.0.0.1")).rejects.toBeInstanceOf(
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
    it("should return decrypted variables and file metadata", async () => {
      mockPrisma.envVariable.findMany.mockResolvedValueOnce([
        {
          id: "var-1",
          environmentId: "env-uuid",
          key: "DB_HOST",
          encryptedValue: "enc",
          iv: "iv",
          authTag: "tag",
        },
      ]);
      mockPrisma.secretFile.findMany.mockResolvedValueOnce([
        { id: "file-1", name: ".env", mimeType: "text/plain", fileSize: 100 },
      ]);

      const result = await service.fetchSecrets(
        baseCiToken as any,
        "dvci_raw",
        "run-123",
        "127.0.0.1",
        "http://localhost:4000",
      );

      expect(result.variables).toHaveLength(1);
      expect(result.variables[0]!.key).toBe("DB_HOST");
      expect(result.variables[0]!.value).toBe("decrypted-value");
      expect(result.files).toHaveLength(1);
      expect(result.files[0]!.downloadUrl).toContain("dvci_raw");
      expect(mockAudit.log).toHaveBeenCalled();
    });
  });

  describe("downloadFile", () => {
    it("should return decrypted file buffer", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce({
        id: "file-1",
        environmentId: "env-uuid",
        name: "config.json",
        mimeType: "application/json",
        encryptedContent: Buffer.from("encrypted"),
        iv: "iv",
        authTag: "tag",
      });

      const result = await service.downloadFile(baseCiToken as any, "file-1");

      expect(result.name).toBe("config.json");
      expect(result.mimeType).toBe("application/json");
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it("should throw NotFoundError when file not in environment", async () => {
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(null);

      expect(service.downloadFile(baseCiToken as any, "bad-id")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });
});
