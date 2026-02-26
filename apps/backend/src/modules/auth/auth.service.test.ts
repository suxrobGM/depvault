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
    Promise.resolve(plain === "valid-refresh-token" && hash === "hashed-refresh-token"),
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
    },
    account: {
      update: mock(() => Promise.resolve({})),
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

    it("should call prisma create with hashed password and EMAIL account", async () => {
      await service.register(validBody);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: "test@example.com",
          username: "testuser",
          passwordHash: "hashed-password",
          accounts: {
            create: {
              provider: "EMAIL",
              providerAccountId: "test@example.com",
            },
          },
        },
      });
    });

    it("should store hashed refresh token on the account", async () => {
      await service.register(validBody);

      expect(mockPrisma.account.update).toHaveBeenCalledWith({
        where: {
          provider_providerAccountId: {
            provider: "EMAIL",
            providerAccountId: "test@example.com",
          },
        },
        data: { refreshToken: "hashed-password" },
      });
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

  describe("refresh", () => {
    const validUser = {
      id: "user-uuid",
      email: "test@example.com",
      username: "testuser",
      role: "USER",
      emailVerified: false,
      deletedAt: null,
      accounts: [{ id: "account-uuid", refreshToken: "hashed-refresh-token" }],
    };

    it("should return new tokens for a valid refresh token", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(validUser);

      const result = await service.refresh({ refreshToken: "valid-refresh-token" });

      expect(result.accessToken).toBe("mock-access-token");
      expect(result.refreshToken).toBe("mock-refresh-token");
      expect(result.user.id).toBe("user-uuid");
    });

    it("should rotate the refresh token in the database", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(validUser);

      await service.refresh({ refreshToken: "valid-refresh-token" });

      expect(mockPrisma.account.update).toHaveBeenCalledWith({
        where: { id: "account-uuid" },
        data: { refreshToken: "hashed-password" },
      });
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
        accounts: [{ id: "account-uuid", refreshToken: null }],
      });

      expect(service.refresh({ refreshToken: "valid-refresh-token" })).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });

    it("should throw UnauthorizedError when refresh token hash does not match", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        ...validUser,
        accounts: [{ id: "account-uuid", refreshToken: "wrong-hash" }],
      });

      expect(service.refresh({ refreshToken: "valid-refresh-token" })).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });
  });
});
