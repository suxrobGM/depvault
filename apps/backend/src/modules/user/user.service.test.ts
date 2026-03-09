import "reflect-metadata";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from "@/common/errors";
import { UserService } from "./user.service";

mock.module("@/common/utils/password", () => ({
  hashPassword: () => Promise.resolve("new-hashed-password"),
  verifyPassword: (plain: string, hash: string) =>
    Promise.resolve(plain === "CurrentPass1" && hash === "hashed-password"),
}));

mock.module("@/common/logger/logger", () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {} },
}));

const baseUser = {
  id: "user-uuid",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  role: "USER",
  avatarUrl: null,
  emailVerified: true,
  githubId: null,
  passwordHash: "hashed-password",
  deletedAt: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

function createMockPrisma() {
  return {
    user: {
      findUnique: mock(() => Promise.resolve(null)),
      findFirst: mock(() => Promise.resolve(null)),
      update: mock(() => Promise.resolve({ ...baseUser })),
    },
    account: {
      updateMany: mock(() => Promise.resolve({ count: 1 })),
    },
  } as any;
}

function createMockEmailService() {
  return { send: mock(() => Promise.resolve()) } as any;
}

describe("UserService", () => {
  let service: UserService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockEmailService: ReturnType<typeof createMockEmailService>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockEmailService = createMockEmailService();
    service = new UserService(mockPrisma, mockEmailService);
  });

  describe("getProfile", () => {
    it("should return the user profile", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);

      const result = await service.getProfile("user-uuid");

      expect(result.id).toBe("user-uuid");
      expect(result.email).toBe("test@example.com");
      expect(result.firstName).toBe("Test");
      expect(result.lastName).toBe("User");
      expect(result.role).toBe("USER");
      expect(result.avatarUrl).toBeNull();
      expect(result.emailVerified).toBe(true);
      expect(result.githubId).toBeNull();
      expect(result.createdAt).toBe("2025-01-01T00:00:00.000Z");
    });

    it("should throw NotFoundError when user does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      expect(service.getProfile("nonexistent")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("updateProfile", () => {
    it("should update firstName and lastName", async () => {
      const updatedUser = { ...baseUser, firstName: "Jane", lastName: "Doe" };
      mockPrisma.user.update.mockResolvedValueOnce(updatedUser);

      const result = await service.updateProfile("user-uuid", {
        firstName: "Jane",
        lastName: "Doe",
      });

      expect(result.firstName).toBe("Jane");
      expect(result.lastName).toBe("Doe");
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-uuid", deletedAt: null },
        data: { firstName: "Jane", lastName: "Doe" },
      });
    });

    it("should update avatarUrl", async () => {
      const updatedUser = { ...baseUser, avatarUrl: "https://example.com/avatar.png" };
      mockPrisma.user.update.mockResolvedValueOnce(updatedUser);

      const result = await service.updateProfile("user-uuid", {
        avatarUrl: "https://example.com/avatar.png",
      });

      expect(result.avatarUrl).toBe("https://example.com/avatar.png");
    });
  });

  describe("changePassword", () => {
    const validBody = { currentPassword: "CurrentPass1", newPassword: "NewPassword1" };

    it("should change password successfully", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);

      const result = await service.changePassword("user-uuid", validBody);

      expect(result.message).toBe("Password changed successfully");
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-uuid" },
        data: { passwordHash: "new-hashed-password" },
      });
    });

    it("should throw BadRequestError for weak new password", async () => {
      expect(
        service.changePassword("user-uuid", {
          currentPassword: "CurrentPass1",
          newPassword: "weak",
        }),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it("should throw NotFoundError when user does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      expect(service.changePassword("user-uuid", validBody)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should throw BadRequestError for OAuth-only accounts", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...baseUser, passwordHash: null });

      expect(service.changePassword("user-uuid", validBody)).rejects.toBeInstanceOf(
        BadRequestError,
      );
    });

    it("should throw UnauthorizedError for wrong current password", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);

      expect(
        service.changePassword("user-uuid", {
          currentPassword: "WrongPass1",
          newPassword: "NewPassword1",
        }),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe("changeEmail", () => {
    const validBody = { newEmail: "new@example.com", password: "CurrentPass1" };

    it("should change email and require re-verification", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);

      const result = await service.changeEmail("user-uuid", validBody);

      expect(result.message).toContain("Please verify your new email");
      expect(mockPrisma.user.update).toHaveBeenCalled();

      const updateCall = mockPrisma.user.update.mock.calls[0][0];
      expect(updateCall.data.email).toBe("new@example.com");
      expect(updateCall.data.emailVerified).toBe(false);
      expect(updateCall.data.emailVerificationToken).toBeDefined();
    });

    it("should send a verification email to the new address", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);

      await service.changeEmail("user-uuid", validBody);

      expect(mockEmailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "new@example.com",
          subject: expect.stringContaining("Verify"),
        }),
      );
    });

    it("should throw NotFoundError when user does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      expect(service.changeEmail("user-uuid", validBody)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should throw BadRequestError for OAuth-only accounts", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...baseUser, passwordHash: null });

      expect(service.changeEmail("user-uuid", validBody)).rejects.toBeInstanceOf(BadRequestError);
    });

    it("should throw UnauthorizedError for wrong password", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);

      expect(
        service.changeEmail("user-uuid", { newEmail: "new@example.com", password: "WrongPass1" }),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("should throw ConflictError when email is already in use", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
      mockPrisma.user.findFirst.mockResolvedValueOnce({ id: "other-uuid" });

      expect(service.changeEmail("user-uuid", validBody)).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe("deleteAccount", () => {
    it("should soft-delete user and revoke tokens", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);

      const result = await service.deleteAccount("user-uuid");

      expect(result.message).toBe("Account deleted successfully");
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-uuid" },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockPrisma.account.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-uuid" },
        data: { refreshToken: null, tokenFamily: null },
      });
    });

    it("should throw NotFoundError when user does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      expect(service.deleteAccount("nonexistent")).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
