import { describe, expect, it } from "bun:test";
import { sanitizeObject, sanitizeValue } from "./log-sanitizer";

describe("sanitizeValue", () => {
  it("should redact password fields", () => {
    expect(sanitizeValue("password", "my-secret-pass")).toBe("[REDACTED]");
  });

  it("should redact case-insensitively", () => {
    expect(sanitizeValue("PASSWORD", "val")).toBe("[REDACTED]");
    expect(sanitizeValue("Password", "val")).toBe("[REDACTED]");
  });

  it("should redact encrypted_value", () => {
    expect(sanitizeValue("encrypted_value", "abc123")).toBe("[REDACTED]");
    expect(sanitizeValue("encryptedValue", "abc123")).toBe("[REDACTED]");
  });

  it("should redact auth_tag", () => {
    expect(sanitizeValue("auth_tag", "tag")).toBe("[REDACTED]");
    expect(sanitizeValue("authTag", "tag")).toBe("[REDACTED]");
  });

  it("should redact token fields", () => {
    expect(sanitizeValue("token", "jwt.token.here")).toBe("[REDACTED]");
    expect(sanitizeValue("refresh_token", "rt")).toBe("[REDACTED]");
    expect(sanitizeValue("access_token", "at")).toBe("[REDACTED]");
  });

  it("should redact key fields", () => {
    expect(sanitizeValue("master_encryption_key", "hex")).toBe("[REDACTED]");
    expect(sanitizeValue("api_key", "key")).toBe("[REDACTED]");
    expect(sanitizeValue("private_key", "pem")).toBe("[REDACTED]");
  });

  it("should not redact non-sensitive fields", () => {
    expect(sanitizeValue("name", "John")).toBe("John");
    expect(sanitizeValue("email", "test@test.com")).toBe("test@test.com");
    expect(sanitizeValue("id", "uuid-123")).toBe("uuid-123");
  });
});

describe("sanitizeObject", () => {
  it("should redact sensitive keys in an object", () => {
    const result = sanitizeObject({
      id: "123",
      password: "secret",
      email: "test@test.com",
    });
    expect(result).toEqual({
      id: "123",
      password: "[REDACTED]",
      email: "test@test.com",
    });
  });

  it("should handle nested objects", () => {
    const result = sanitizeObject({
      user: {
        name: "Alice",
        token: "jwt-token",
      },
    });
    expect(result).toEqual({
      user: {
        name: "Alice",
        token: "[REDACTED]",
      },
    });
  });

  it("should handle arrays", () => {
    const result = sanitizeObject([{ password: "a" }, { password: "b" }]);
    expect(result).toEqual([{ password: "[REDACTED]" }, { password: "[REDACTED]" }]);
  });

  it("should return primitives as-is", () => {
    expect(sanitizeObject(null)).toBeNull();
    expect(sanitizeObject(undefined)).toBeUndefined();
    expect(sanitizeObject("string")).toBe("string");
    expect(sanitizeObject(42)).toBe(42);
  });

  it("should redact Buffer values", () => {
    const result = sanitizeObject(Buffer.from("sensitive"));
    expect(result).toBe("[REDACTED]");
  });

  it("should handle complex nested structures", () => {
    const result = sanitizeObject({
      project: {
        id: "proj-1",
        variables: [
          { key: "DB_HOST", encrypted_value: "cipher1", iv: "iv1", auth_tag: "tag1" },
          { key: "API_URL", encrypted_value: "cipher2", iv: "iv2", auth_tag: "tag2" },
        ],
      },
    });
    expect(result).toEqual({
      project: {
        id: "proj-1",
        variables: [
          {
            key: "DB_HOST",
            encrypted_value: "[REDACTED]",
            iv: "[REDACTED]",
            auth_tag: "[REDACTED]",
          },
          {
            key: "API_URL",
            encrypted_value: "[REDACTED]",
            iv: "[REDACTED]",
            auth_tag: "[REDACTED]",
          },
        ],
      },
    });
  });
});
