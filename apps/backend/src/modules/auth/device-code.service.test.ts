import "reflect-metadata";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { BadRequestError, NotFoundError } from "@/common/errors";
import { DeviceCodeService } from "./device-code.service";

const MOCK_USER = {
  id: "user-uuid",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  role: "USER",
  emailVerified: true,
  avatarUrl: null,
  accounts: [{ provider: "EMAIL", providerAccountId: "test@example.com" }],
};

const MOCK_TOKENS = {
  accessToken: "mock-access-token",
  refreshToken: "mock-refresh-token",
  user: {
    id: "user-uuid",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    role: "USER",
    emailVerified: true,
    avatarUrl: null,
  },
};

function createMockPrisma() {
  return {
    deviceCode: {
      create: mock(() => Promise.resolve({})),
      findUnique: mock(() => Promise.resolve(null)),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
      deleteMany: mock(() => Promise.resolve({ count: 0 })),
    },
  } as any;
}

function createMockTokenService() {
  return {
    issueTokens: mock(() => Promise.resolve(MOCK_TOKENS)),
  } as any;
}

describe("DeviceCodeService", () => {
  let service: DeviceCodeService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let tokenService: ReturnType<typeof createMockTokenService>;

  beforeEach(() => {
    process.env.FRONTEND_URL = "http://localhost:4001";
    prisma = createMockPrisma();
    tokenService = createMockTokenService();
    service = new DeviceCodeService(prisma, tokenService);
  });

  describe("createDeviceCode", () => {
    it("should create a device code and return user code with dash", async () => {
      const result = await service.createDeviceCode();

      expect(result.deviceCode).toBeString();
      expect(result.deviceCode).toHaveLength(64);
      expect(result.userCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(result.verificationUrl).toBe(
        `http://localhost:4001/cli/verify?code=${result.userCode}`,
      );
      expect(result.expiresIn).toBe(900);
      expect(prisma.deviceCode.create).toHaveBeenCalledTimes(1);
    });

    it("should cleanup expired codes before creating", async () => {
      await service.createDeviceCode();

      expect(prisma.deviceCode.deleteMany).toHaveBeenCalledTimes(1);
      expect(prisma.deviceCode.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      });
    });

    it("should not contain ambiguous characters in user code", async () => {
      for (let i = 0; i < 20; i++) {
        const result = await service.createDeviceCode();
        const raw = result.userCode.replace("-", "");
        expect(raw).not.toMatch(/[0OIL1]/);
      }
    });
  });

  describe("verifyDeviceCode", () => {
    it("should verify a pending device code", async () => {
      prisma.deviceCode.findUnique.mockResolvedValueOnce({
        id: "code-id",
        userCode: "ABCD-EFGH",
        status: "PENDING",
        expiresAt: new Date(Date.now() + 60_000),
      });

      const result = await service.verifyDeviceCode("ABCD-EFGH", "user-uuid");

      expect(result.message).toBe("Device authorized successfully");
      expect(prisma.deviceCode.update).toHaveBeenCalledWith({
        where: { id: "code-id" },
        data: { status: "VERIFIED", userId: "user-uuid" },
      });
    });

    it("should uppercase the user code for lookup", async () => {
      prisma.deviceCode.findUnique.mockResolvedValueOnce({
        id: "code-id",
        userCode: "ABCD-EFGH",
        status: "PENDING",
        expiresAt: new Date(Date.now() + 60_000),
      });

      await service.verifyDeviceCode("abcd-efgh", "user-uuid");

      expect(prisma.deviceCode.findUnique).toHaveBeenCalledWith({
        where: { userCode: "ABCD-EFGH" },
      });
    });

    it("should throw NotFoundError for invalid code", async () => {
      prisma.deviceCode.findUnique.mockResolvedValueOnce(null);

      expect(service.verifyDeviceCode("XXXX-YYYY", "user-uuid")).rejects.toThrow(NotFoundError);
    });

    it("should throw BadRequestError for expired code", async () => {
      prisma.deviceCode.findUnique.mockResolvedValueOnce({
        id: "code-id",
        userCode: "ABCD-EFGH",
        status: "PENDING",
        expiresAt: new Date(Date.now() - 60_000),
      });

      expect(service.verifyDeviceCode("ABCD-EFGH", "user-uuid")).rejects.toThrow(BadRequestError);
    });

    it("should throw BadRequestError for already verified code", async () => {
      prisma.deviceCode.findUnique.mockResolvedValueOnce({
        id: "code-id",
        userCode: "ABCD-EFGH",
        status: "VERIFIED",
        expiresAt: new Date(Date.now() + 60_000),
      });

      expect(service.verifyDeviceCode("ABCD-EFGH", "user-uuid")).rejects.toThrow(BadRequestError);
    });
  });

  describe("pollDeviceCode", () => {
    it("should return pending for a pending code", async () => {
      prisma.deviceCode.findUnique.mockResolvedValueOnce({
        id: "code-id",
        deviceCode: "device-code-hex",
        status: "PENDING",
        expiresAt: new Date(Date.now() + 60_000),
        user: null,
      });

      const result = await service.pollDeviceCode("device-code-hex");

      expect(result.status).toBe("pending");
    });

    it("should return tokens for a verified code", async () => {
      prisma.deviceCode.findUnique.mockResolvedValueOnce({
        id: "code-id",
        deviceCode: "device-code-hex",
        status: "VERIFIED",
        expiresAt: new Date(Date.now() + 60_000),
        user: MOCK_USER,
      });

      const result = await service.pollDeviceCode("device-code-hex");

      expect(result.status).toBe("verified");
      expect(result).toHaveProperty("accessToken", "mock-access-token");
      expect(result).toHaveProperty("refreshToken", "mock-refresh-token");
      expect(tokenService.issueTokens).toHaveBeenCalledWith(MOCK_USER, "EMAIL", "test@example.com");
      expect(prisma.deviceCode.delete).toHaveBeenCalledWith({ where: { id: "code-id" } });
    });

    it("should return expired for a non-existent code", async () => {
      prisma.deviceCode.findUnique.mockResolvedValueOnce(null);

      const result = await service.pollDeviceCode("nonexistent");

      expect(result.status).toBe("expired");
    });

    it("should return expired for a code past its expiry", async () => {
      prisma.deviceCode.findUnique.mockResolvedValueOnce({
        id: "code-id",
        deviceCode: "device-code-hex",
        status: "PENDING",
        expiresAt: new Date(Date.now() - 60_000),
        user: null,
      });

      const result = await service.pollDeviceCode("device-code-hex");

      expect(result.status).toBe("expired");
    });

    it("should return expired if verified user has no accounts", async () => {
      prisma.deviceCode.findUnique.mockResolvedValueOnce({
        id: "code-id",
        deviceCode: "device-code-hex",
        status: "VERIFIED",
        expiresAt: new Date(Date.now() + 60_000),
        user: { ...MOCK_USER, accounts: [] },
      });

      const result = await service.pollDeviceCode("device-code-hex");

      expect(result.status).toBe("expired");
    });

    it("should cleanup expired codes on each poll", async () => {
      prisma.deviceCode.findUnique.mockResolvedValueOnce(null);

      await service.pollDeviceCode("any-code");

      expect(prisma.deviceCode.deleteMany).toHaveBeenCalledTimes(1);
    });
  });
});
