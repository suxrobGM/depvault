import "reflect-metadata";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { BadRequestError, ForbiddenError, GoneError, NotFoundError } from "@/common/errors";
import * as encryption from "@/common/utils/encryption";
import * as password from "@/common/utils/password";
import { SharedSecretService } from "./shared-secret.service";

const now = new Date();
const futureDate = new Date(Date.now() + 86400 * 1000);
const pastDate = new Date(Date.now() - 1000);

const projectId = "project-uuid";
const userId = "user-uuid";
const fileId = "file-uuid";
const secretId = "secret-uuid";
const token = "abc123token";

const fakeProjectKey = Buffer.alloc(32, 1);
const fakeEncrypted = { ciphertext: "cipher", iv: "iv-val", authTag: "tag-val" };

const mockEnvVariable = {
  id: "var-uuid",
  key: "API_KEY",
  encryptedValue: "enc-val",
  iv: "iv-val",
  authTag: "tag-val",
  environmentId: "env-uuid",
};

const mockSecretFile = {
  id: fileId,
  name: "config.json",
  mimeType: "application/json",
  encryptedContent: Buffer.from("encrypted"),
  iv: "iv-val",
  authTag: "tag-val",
  environmentId: "env-uuid",
};

function makeSharedSecret(overrides: Record<string, unknown> = {}) {
  return {
    id: secretId,
    token,
    projectId,
    creatorId: userId,
    encryptedPayload: "cipher",
    iv: "iv-val",
    authTag: "tag-val",
    passwordHash: null,
    payloadType: "ENV_VARIABLES",
    fileName: null,
    mimeType: null,
    status: "PENDING",
    expiresAt: futureDate,
    viewedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMockPrisma() {
  return {
    projectMember: {
      findUnique: mock(() => Promise.resolve(null)),
    },
    envVariable: {
      findMany: mock(() => Promise.resolve([])),
    },
    secretFile: {
      findFirst: mock(() => Promise.resolve(null)),
    },
    sharedSecret: {
      create: mock(() => Promise.resolve(makeSharedSecret())),
      findUnique: mock(() => Promise.resolve(null)),
      findFirst: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
      update: mock(() => Promise.resolve(makeSharedSecret())),
      updateMany: mock(() => Promise.resolve({ count: 0 })),
      delete: mock(() => Promise.resolve(makeSharedSecret())),
    },
  } as any;
}

function createMockAuditLogService() {
  return { log: mock(() => Promise.resolve()) } as any;
}

describe("SharedSecretService", () => {
  let service: SharedSecretService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockAuditLog: ReturnType<typeof createMockAuditLogService>;

  beforeEach(() => {
    mock.restore();
    mockPrisma = createMockPrisma();
    mockAuditLog = createMockAuditLogService();
    service = new SharedSecretService(mockPrisma, mockAuditLog);

    spyOn(encryption, "deriveProjectKey").mockReturnValue(fakeProjectKey);
    spyOn(encryption, "encrypt").mockReturnValue(fakeEncrypted);
    spyOn(encryption, "decrypt").mockReturnValue(
      JSON.stringify([{ key: "API_KEY", value: "secret" }]),
    );
    spyOn(encryption, "decryptBinary").mockReturnValue(Buffer.from("file-content"));
    spyOn(password, "createRandomToken").mockReturnValue(token);
    spyOn(password, "hashPassword").mockResolvedValue("hashed-password");
  });

  describe("createForEnvVariables", () => {
    it("should create a share link for env variables", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findMany.mockResolvedValueOnce([mockEnvVariable]);

      const result = await service.createForEnvVariables(
        projectId,
        userId,
        { variableIds: ["var-uuid"], expiresIn: 86400 },
        "127.0.0.1",
      );

      expect(result.token).toBe(token);
      expect(result.shareUrl).toContain(`/s/${token}`);
      expect(encryption.encrypt).toHaveBeenCalled();
      expect(mockPrisma.sharedSecret.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ payloadType: "ENV_VARIABLES", token }),
        }),
      );
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "SHARE", resourceType: "SHARE_LINK" }),
      );
    });

    it("should hash password when provided", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findMany.mockResolvedValueOnce([mockEnvVariable]);

      await service.createForEnvVariables(
        projectId,
        userId,
        { variableIds: ["var-uuid"], expiresIn: 86400, password: "s3cr3t" },
        "127.0.0.1",
      );

      expect(password.hashPassword).toHaveBeenCalledWith("s3cr3t");
      expect(mockPrisma.sharedSecret.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ passwordHash: "hashed-password" }),
        }),
      );
    });

    it("should throw NotFoundError when no variables match", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.envVariable.findMany.mockResolvedValueOnce([]);

      expect(
        service.createForEnvVariables(projectId, userId, {
          variableIds: ["bad-id"],
          expiresIn: 86400,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should throw ForbiddenError for VIEWER role", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "VIEWER" });

      expect(
        service.createForEnvVariables(projectId, userId, {
          variableIds: ["var-uuid"],
          expiresIn: 86400,
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("should throw NotFoundError when not a project member", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(null);

      expect(
        service.createForEnvVariables(projectId, userId, {
          variableIds: ["var-uuid"],
          expiresIn: 86400,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("createForFile", () => {
    it("should create a share link for a secret file", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "EDITOR" });
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(mockSecretFile);
      mockPrisma.sharedSecret.create.mockResolvedValueOnce(
        makeSharedSecret({
          payloadType: "SECRET_FILE",
          fileName: "config.json",
          mimeType: "application/json",
        }),
      );

      const result = await service.createForFile(
        projectId,
        userId,
        fileId,
        { expiresIn: 3600 },
        "127.0.0.1",
      );

      expect(result.shareUrl).toContain(`/s/${token}`);
      expect(encryption.decryptBinary).toHaveBeenCalled();
      expect(encryption.encrypt).toHaveBeenCalled();
      expect(mockPrisma.sharedSecret.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            payloadType: "SECRET_FILE",
            fileName: "config.json",
            mimeType: "application/json",
          }),
        }),
      );
    });

    it("should throw NotFoundError when file does not exist", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.secretFile.findFirst.mockResolvedValueOnce(null);

      expect(
        service.createForFile(projectId, userId, fileId, { expiresIn: 3600 }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should throw ForbiddenError for VIEWER role", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "VIEWER" });

      expect(
        service.createForFile(projectId, userId, fileId, { expiresIn: 3600 }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe("getInfo", () => {
    it("should return metadata for a valid pending secret", async () => {
      mockPrisma.sharedSecret.findUnique.mockResolvedValueOnce(makeSharedSecret());

      const info = await service.getInfo(token);

      expect(info.payloadType).toBe("ENV_VARIABLES");
      expect(info.hasPassword).toBe(false);
      expect(info.expiresAt).toEqual(futureDate);
    });

    it("should reflect hasPassword true when passwordHash is set", async () => {
      mockPrisma.sharedSecret.findUnique.mockResolvedValueOnce(
        makeSharedSecret({ passwordHash: "hashed" }),
      );

      const info = await service.getInfo(token);

      expect(info.hasPassword).toBe(true);
    });

    it("should throw NotFoundError when token does not exist", async () => {
      mockPrisma.sharedSecret.findUnique.mockResolvedValueOnce(null);

      expect(service.getInfo("bad-token")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should throw GoneError for already viewed secret", async () => {
      mockPrisma.sharedSecret.findUnique.mockResolvedValueOnce(
        makeSharedSecret({ status: "VIEWED" }),
      );

      expect(service.getInfo(token)).rejects.toBeInstanceOf(GoneError);
    });

    it("should throw GoneError for expired status", async () => {
      mockPrisma.sharedSecret.findUnique.mockResolvedValueOnce(
        makeSharedSecret({ status: "EXPIRED" }),
      );

      expect(service.getInfo(token)).rejects.toBeInstanceOf(GoneError);
    });

    it("should mark PENDING secret as EXPIRED and throw GoneError when past expiresAt", async () => {
      mockPrisma.sharedSecret.findUnique.mockResolvedValueOnce(
        makeSharedSecret({ expiresAt: pastDate }),
      );

      await expect(service.getInfo(token)).rejects.toBeInstanceOf(GoneError);

      expect(mockPrisma.sharedSecret.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "EXPIRED" } }),
      );
    });
  });

  describe("access", () => {
    it("should decrypt and return env variables, then consume the secret", async () => {
      mockPrisma.sharedSecret.findUnique.mockResolvedValueOnce(makeSharedSecret());

      const result = await service.access(token, undefined, "1.2.3.4");

      expect(result.payloadType).toBe("ENV_VARIABLES");
      expect((result as any).variables).toEqual([{ key: "API_KEY", value: "secret" }]);
      expect(mockPrisma.sharedSecret.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "VIEWED",
            encryptedPayload: "",
            iv: "",
            authTag: "",
          }),
        }),
      );
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "READ", resourceType: "SHARE_LINK" }),
      );
    });

    it("should return file content for SECRET_FILE payload", async () => {
      spyOn(encryption, "decrypt").mockReturnValueOnce("base64-file-content");
      mockPrisma.sharedSecret.findUnique.mockResolvedValueOnce(
        makeSharedSecret({
          payloadType: "SECRET_FILE",
          fileName: "config.json",
          mimeType: "application/json",
        }),
      );

      const result = await service.access(token, undefined, "1.2.3.4");

      expect(result.payloadType).toBe("SECRET_FILE");
      expect((result as any).fileName).toBe("config.json");
      expect((result as any).content).toBe("base64-file-content");
    });

    it("should verify correct password", async () => {
      spyOn(Bun.password, "verify").mockResolvedValueOnce(true);
      mockPrisma.sharedSecret.findUnique.mockResolvedValueOnce(
        makeSharedSecret({ passwordHash: "hashed" }),
      );

      const result = await service.access(token, "correct-password");

      expect(result.payloadType).toBe("ENV_VARIABLES");
    });

    it("should throw BadRequestError when password is required but not provided", async () => {
      mockPrisma.sharedSecret.findUnique.mockResolvedValueOnce(
        makeSharedSecret({ passwordHash: "hashed" }),
      );

      expect(service.access(token, undefined)).rejects.toBeInstanceOf(BadRequestError);
    });

    it("should throw BadRequestError for wrong password", async () => {
      spyOn(Bun.password, "verify").mockResolvedValueOnce(false);
      mockPrisma.sharedSecret.findUnique.mockResolvedValueOnce(
        makeSharedSecret({ passwordHash: "hashed" }),
      );

      expect(service.access(token, "wrong-password")).rejects.toBeInstanceOf(BadRequestError);
    });

    it("should throw GoneError for already viewed secret", async () => {
      mockPrisma.sharedSecret.findUnique.mockResolvedValueOnce(
        makeSharedSecret({ status: "VIEWED" }),
      );

      expect(service.access(token)).rejects.toBeInstanceOf(GoneError);
    });

    it("should throw GoneError and update status for expired secret", async () => {
      mockPrisma.sharedSecret.findUnique.mockResolvedValueOnce(
        makeSharedSecret({ expiresAt: pastDate }),
      );

      await expect(service.access(token)).rejects.toBeInstanceOf(GoneError);

      expect(mockPrisma.sharedSecret.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "EXPIRED" } }),
      );
    });

    it("should throw NotFoundError for unknown token", async () => {
      mockPrisma.sharedSecret.findUnique.mockResolvedValueOnce(null);

      expect(service.access("unknown-token")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("list", () => {
    it("should expire stale PENDING records and return all secrets", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.sharedSecret.findMany.mockResolvedValueOnce([makeSharedSecret()]);

      const result = await service.list(projectId, userId);

      expect(mockPrisma.sharedSecret.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "PENDING" }),
          data: { status: "EXPIRED" },
        }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.token).toBe(token);
      expect(result.items[0]!.hasPassword).toBe(false);
    });

    it("should throw ForbiddenError for VIEWER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "VIEWER" });

      expect(service.list(projectId, userId)).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe("revoke", () => {
    it("should delete a PENDING secret and log the audit event", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.sharedSecret.findFirst.mockResolvedValueOnce(makeSharedSecret());

      const result = await service.revoke(projectId, secretId, userId, "1.2.3.4");

      expect(result.message).toBe("Shared secret revoked");
      expect(mockPrisma.sharedSecret.delete).toHaveBeenCalledWith({ where: { id: secretId } });
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "DELETE", resourceType: "SHARE_LINK" }),
      );
    });

    it("should throw BadRequestError when trying to revoke a non-PENDING secret", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.sharedSecret.findFirst.mockResolvedValueOnce(
        makeSharedSecret({ status: "VIEWED" }),
      );

      expect(service.revoke(projectId, secretId, userId)).rejects.toBeInstanceOf(BadRequestError);
    });

    it("should throw NotFoundError when secret does not exist", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      mockPrisma.sharedSecret.findFirst.mockResolvedValueOnce(null);

      expect(service.revoke(projectId, secretId, userId)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should throw ForbiddenError for VIEWER", async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({ role: "VIEWER" });

      expect(service.revoke(projectId, secretId, userId)).rejects.toBeInstanceOf(ForbiddenError);
    });
  });
});
