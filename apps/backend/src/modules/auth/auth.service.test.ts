import "reflect-metadata";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { BadRequestError, ConflictError, UnauthorizedError } from "@/common/errors";
import { AuthService } from "./auth.service";

mock.module("@/common/utils/jwt", () => ({
  signAccessToken: () => Promise.resolve("mock-access-token"),
  signRefreshToken: () => Promise.resolve("mock-refresh-token"),
  verifyRefreshToken: (token: string) => {
    if (token === "valid-refresh-token") return Promise.resolve({ sub: "user-uuid" });
    return Promise.reject(new Error("Invalid token"));
  },
}));

mock.module("@/common/utils/password", () => ({
  hashPassword: () => Promise.resolve("hashed-password"),
  verifyPassword: (plain: string, hash: string) =>
    Promise.resolve(
      (plain === "valid-refresh-token" && hash === "hashed-refresh-token") ||
        (plain === "Password1" && hash === "hashed-password"),
    ),
}));

mock.module("@/common/utils/logger", () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {} },
}));

function createMockPrisma() {
  return {
    user: {
      findFirst: mock(() => Promise.resolve(null)),
      findUnique: mock(() => Promise.resolve(null)),
      create: mock(() =>
        Promise.resolve({
          id: "user-uuid",
          email: "test@example.com",
          username: "testuser",
          role: "USER",
          emailVerified: false,
          passwordHash: "hashed-password",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      update: mock(() => Promise.resolve({})),
    },
    account: {
      update: mock(() => Promise.resolve({})),
      updateMany: mock(() => Promise.resolve({ count: 1 })),
    },
  } as any;
}

describe("AuthService", () => {
  let service: AuthService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new AuthService(mockPrisma);
  });

  describe("register", () => {
    const validBody = {
      email: "test@example.com",
      username: "testuser",
      password: "Password1",
    };

    it("should register a new user and return both tokens", async () => {
      const result = await service.register(validBody);

      expect(result.accessToken).toBe("mock-access-token");
      expect(result.refreshToken).toBe("mock-refresh-token");
      expect(result.user.email).toBe("test@example.com");
      expect(result.user.username).toBe("testuser");
      expect(result.user.role).toBe("USER");
      expect(result.user.emailVerified).toBe(false);
    });

    it("should throw BadRequestError when password has no uppercase letter", async () => {
      expect(service.register({ ...validBody, password: "password1" })).rejects.toBeInstanceOf(
        BadRequestError,
      );
    });

    it("should throw BadRequestError when password has no number", async () => {
      expect(service.register({ ...validBody, password: "Password" })).rejects.toBeInstanceOf(
        BadRequestError,
      );
    });

    it("should throw BadRequestError when password is too short", async () => {
      expect(service.register({ ...validBody, password: "Pass1" })).rejects.toBeInstanceOf(
        BadRequestError,
      );
    });

    it("should throw ConflictError when email already exists", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        email: "test@example.com",
        username: "other",
      });

      expect(service.register(validBody)).rejects.toThrow("User with this email already exists");
    });

    it("should throw ConflictError when username already exists", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        email: "other@example.com",
        username: "testuser",
      });

      expect(service.register(validBody)).rejects.toThrow("User with this username already exists");
    });

    it("should throw ConflictError instance for duplicate user", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        email: "test@example.com",
        username: "testuser",
      });

      expect(service.register(validBody)).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe("login", () => {
    const loginBody = { email: "test@example.com", password: "Password1" };

    const verifiedUser = {
      id: "user-uuid",
      email: "test@example.com",
      username: "testuser",
      role: "USER",
      emailVerified: true,
      passwordHash: "hashed-password",
      deletedAt: null,
      accounts: [{ id: "account-uuid", refreshToken: "old-hash", tokenFamily: "old-family" }],
    };

    it("should return tokens for valid credentials", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(verifiedUser);

      const result = await service.login(loginBody);

      expect(result.accessToken).toBe("mock-access-token");
      expect(result.refreshToken).toBe("mock-refresh-token");
      expect(result.user.email).toBe("test@example.com");
    });

    it("should throw UnauthorizedError for non-existent user", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      expect(service.login(loginBody)).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("should throw UnauthorizedError for unverified email", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        ...verifiedUser,
        emailVerified: false,
      });

      expect(service.login(loginBody)).rejects.toThrow(
        "Please verify your email before logging in",
      );
    });

    it("should throw UnauthorizedError for wrong password", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(verifiedUser);

      expect(service.login({ ...loginBody, password: "WrongPass1" })).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });

    it("should throw UnauthorizedError for soft-deleted user", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        ...verifiedUser,
        deletedAt: new Date(),
      });

      expect(service.login(loginBody)).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe("refresh", () => {
    const validUser = {
      id: "user-uuid",
      email: "test@example.com",
      username: "testuser",
      role: "USER",
      emailVerified: true,
      deletedAt: null,
      accounts: [
        { id: "account-uuid", refreshToken: "hashed-refresh-token", tokenFamily: "family-uuid" },
      ],
    };

    it("should return new tokens for a valid refresh token", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(validUser);

      const result = await service.refresh({ refreshToken: "valid-refresh-token" });

      expect(result.accessToken).toBe("mock-access-token");
      expect(result.refreshToken).toBe("mock-refresh-token");
      expect(result.user.id).toBe("user-uuid");
    });

    it("should throw UnauthorizedError for an expired/invalid refresh token", async () => {
      expect(service.refresh({ refreshToken: "expired-token" })).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });

    it("should throw UnauthorizedError when user is not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      expect(service.refresh({ refreshToken: "valid-refresh-token" })).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });

    it("should throw UnauthorizedError when user is soft-deleted", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        ...validUser,
        deletedAt: new Date(),
      });

      expect(service.refresh({ refreshToken: "valid-refresh-token" })).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });

    it("should throw UnauthorizedError when no stored refresh token exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        ...validUser,
        accounts: [{ id: "account-uuid", refreshToken: null, tokenFamily: null }],
      });

      expect(service.refresh({ refreshToken: "valid-refresh-token" })).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });

    it("should revoke token family on replay attack and throw UnauthorizedError", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        ...validUser,
        accounts: [{ id: "account-uuid", refreshToken: "wrong-hash", tokenFamily: "family-uuid" }],
      });

      await expect(service.refresh({ refreshToken: "valid-refresh-token" })).rejects.toBeInstanceOf(
        UnauthorizedError,
      );

      expect(mockPrisma.account.update).toHaveBeenCalledWith({
        where: { id: "account-uuid" },
        data: { refreshToken: null, tokenFamily: null },
      });
    });
  });

  describe("forgotPassword", () => {
    it("should return success message even if user does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await service.forgotPassword({ email: "nonexistent@example.com" });

      expect(result.message).toContain("If an account with that email exists");
    });

    it("should set reset token on existing user", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "user-uuid",
        email: "test@example.com",
        deletedAt: null,
      });

      const result = await service.forgotPassword({ email: "test@example.com" });

      expect(result.message).toContain("If an account with that email exists");
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    it("should throw BadRequestError for weak password", async () => {
      expect(
        service.resetPassword({ token: "valid-token", password: "weak" }),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it("should throw BadRequestError for invalid/expired token", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);

      expect(
        service.resetPassword({ token: "invalid-token", password: "NewPassword1" }),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it("should reset password and revoke refresh tokens", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        id: "user-uuid",
        email: "test@example.com",
      });

      const result = await service.resetPassword({
        token: "valid-token",
        password: "NewPassword1",
      });

      expect(result.message).toBe("Password has been reset successfully");
      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockPrisma.account.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-uuid" },
        data: { refreshToken: null, tokenFamily: null },
      });
    });
  });

  describe("verifyEmail", () => {
    it("should throw BadRequestError for invalid token", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);

      expect(service.verifyEmail({ token: "invalid-token" })).rejects.toBeInstanceOf(
        BadRequestError,
      );
    });

    it("should verify email and clear token", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        id: "user-uuid",
        emailVerified: false,
        emailVerificationToken: "valid-token",
      });

      const result = await service.verifyEmail({ token: "valid-token" });

      expect(result.message).toBe("Email verified successfully");
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-uuid" },
        data: { emailVerified: true, emailVerificationToken: null },
      });
    });
  });
});
