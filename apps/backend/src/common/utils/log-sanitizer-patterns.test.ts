import { describe, expect, it } from "bun:test";
import { sanitizeObject, sanitizeValue } from "./log-sanitizer";

// Build test secrets at runtime to avoid triggering GitHub push protection
function fakeSecret(prefix: string, body: string, sep = "_"): string {
  return [prefix, body].join(sep);
}

describe("content-based secret pattern detection", () => {
  describe("sanitizeValue", () => {
    it("should redact AWS access key IDs", () => {
      expect(sanitizeValue("someField", fakeSecret("AKIA", "IOSFODNN7EXAMPLE", ""))).toBe(
        "[REDACTED]",
      );
    });

    it("should redact GitHub personal access tokens", () => {
      expect(
        sanitizeValue("header", fakeSecret("ghp", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij")),
      ).toBe("[REDACTED]");
    });

    it("should redact GitLab personal access tokens", () => {
      expect(sanitizeValue("key", fakeSecret("glpat", "abcdefghijklmnopqrstu", "-"))).toBe(
        "[REDACTED]",
      );
    });

    it("should redact Stripe live keys", () => {
      const stripeKey = ["sk", "live", "abcdefghijklmnopqrstuvwx"].join("_");
      expect(sanitizeValue("key", stripeKey)).toBe("[REDACTED]");
    });

    it("should redact JWT tokens", () => {
      const jwt = [
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        "eyJzdWIiOiIxMjM0NTY3ODkwIn0",
        "dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
      ].join(".");
      expect(sanitizeValue("data", jwt)).toBe("[REDACTED]");
    });

    it("should redact private key headers", () => {
      const beginKey = (type: string) => `-----BEGIN ${type}PRIVATE KEY-----`;
      expect(sanitizeValue("content", beginKey("RSA "))).toBe("[REDACTED]");
      expect(sanitizeValue("content", beginKey(""))).toBe("[REDACTED]");
      expect(sanitizeValue("content", beginKey("EC "))).toBe("[REDACTED]");
    });

    it("should redact connection strings with credentials", () => {
      expect(sanitizeValue("url", "postgres://admin:secretpass@db.example.com:5432/mydb")).toBe(
        "[REDACTED]",
      );
      expect(sanitizeValue("url", "mongodb+srv://user:pass@cluster0.example.net/db")).toBe(
        "[REDACTED]",
      );
      expect(sanitizeValue("url", "redis://default:mypass@redis.example.com:6379")).toBe(
        "[REDACTED]",
      );
    });

    it("should redact long base64-encoded secrets", () => {
      const base64Secret = "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3ODkw";
      expect(sanitizeValue("data", base64Secret)).toBe("[REDACTED]");
    });

    it("should not redact normal strings", () => {
      expect(sanitizeValue("name", "John Doe")).toBe("John Doe");
      expect(sanitizeValue("message", "Hello world")).toBe("Hello world");
      expect(sanitizeValue("id", "550e8400-e29b-41d4-a716-446655440000")).toBe(
        "550e8400-e29b-41d4-a716-446655440000",
      );
    });

    it("should not redact short base64 strings", () => {
      expect(sanitizeValue("data", "aGVsbG8=")).toBe("aGVsbG8=");
    });
  });

  describe("sanitizeObject with content patterns", () => {
    it("should redact string values matching secret patterns in objects", () => {
      const result = sanitizeObject({
        name: "my-service",
        config: "postgres://admin:pass123@localhost:5432/db",
      });
      expect(result).toEqual({
        name: "my-service",
        config: "[REDACTED]",
      });
    });

    it("should redact JWT values in nested objects", () => {
      const jwt = ["eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiIxMjM0NTY3ODkwIn0", "abc123def456"].join(".");
      const result = sanitizeObject({
        auth: { bearer: jwt },
      });
      expect(result).toEqual({
        auth: { bearer: "[REDACTED]" },
      });
    });

    it("should redact connection strings in arrays", () => {
      const result = sanitizeObject(["normal string", "mysql://root:password@db:3306/app"]);
      expect(result).toEqual(["normal string", "[REDACTED]"]);
    });

    it("should redact database_url key by key name", () => {
      expect(sanitizeValue("database_url", "postgres://localhost/db")).toBe("[REDACTED]");
      expect(sanitizeValue("databaseUrl", "postgres://localhost/db")).toBe("[REDACTED]");
    });

    it("should redact connection_string key by key name", () => {
      expect(sanitizeValue("connection_string", "some-value")).toBe("[REDACTED]");
      expect(sanitizeValue("connectionString", "some-value")).toBe("[REDACTED]");
    });
  });
});
