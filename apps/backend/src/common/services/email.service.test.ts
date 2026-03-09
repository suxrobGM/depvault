import "reflect-metadata";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { logger } from "@/common/logger/logger";
import { EmailService } from "./email.service";

const mockSend = mock(() => Promise.resolve({ data: { id: "email-id" }, error: null }));

mock.module("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

mock.module("@react-email/render", () => ({
  render: () => Promise.resolve("<html>rendered</html>"),
}));

mock.module("@/common/logger/logger", () => ({
  logger: {
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    debug: mock(() => {}),
  },
}));

describe("EmailService", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("when RESEND_API_KEY is set", () => {
    let service: EmailService;

    beforeEach(() => {
      process.env.RESEND_API_KEY = "re_test_key";
      process.env.EMAIL_FROM_NAME = "TestApp";
      process.env.EMAIL_FROM_ADDRESS = "test@example.com";
      mockSend.mockClear();
      service = new EmailService();
    });

    it("should send email via Resend", async () => {
      const react = { type: "div", props: {}, key: null } as any;

      await service.send({ to: "user@example.com", subject: "Test", react });

      expect(mockSend).toHaveBeenCalledWith({
        from: "TestApp <test@example.com>",
        to: "user@example.com",
        subject: "Test",
        html: "<html>rendered</html>",
      });
    });

    it("should catch and log errors from Resend", async () => {
      mockSend.mockRejectedValueOnce(new Error("API error"));
      const react = { type: "div", props: {}, key: null } as any;

      await service.send({ to: "user@example.com", subject: "Test", react });

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("when RESEND_API_KEY is not set", () => {
    let service: EmailService;

    beforeEach(() => {
      delete process.env.RESEND_API_KEY;
      mockSend.mockClear();
      service = new EmailService();
    });

    it("should log instead of sending", async () => {
      const react = { type: "div", props: {}, key: null } as any;

      await service.send({ to: "user@example.com", subject: "Test", react });

      expect(mockSend).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
    });

    it("should warn about missing API key on construction", () => {
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
