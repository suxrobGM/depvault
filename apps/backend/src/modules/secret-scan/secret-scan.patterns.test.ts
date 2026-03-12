import { describe, expect, it } from "bun:test";
import { BUILT_IN_PATTERNS, getCompiledBuiltInPatterns } from "./secret-scan.patterns";

describe("BUILT_IN_PATTERNS", () => {
  it("should contain at least 10 patterns", () => {
    expect(BUILT_IN_PATTERNS.length).toBeGreaterThanOrEqual(10);
  });

  it("should have valid regex for all patterns", () => {
    for (const pattern of BUILT_IN_PATTERNS) {
      expect(() => new RegExp(pattern.regex)).not.toThrow();
    }
  });

  it("should detect AWS access key", () => {
    const pattern = BUILT_IN_PATTERNS.find((p) => p.name === "AWS Access Key ID")!;
    const regex = new RegExp(pattern.regex);
    expect(regex.test("AKIAIOSFODNN7EXAMPLE")).toBe(true);
    expect(regex.test("not-an-aws-key")).toBe(false);
  });

  it("should detect GitHub classic token", () => {
    const pattern = BUILT_IN_PATTERNS.find((p) => p.name === "GitHub Token (Classic)")!;
    const regex = new RegExp(pattern.regex);
    expect(regex.test("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij")).toBe(true);
    expect(regex.test("ghp_short")).toBe(false);
  });

  it("should detect Stripe secret key", () => {
    const pattern = BUILT_IN_PATTERNS.find((p) => p.name === "Stripe Secret Key")!;
    const regex = new RegExp(pattern.regex);
    expect(regex.test("sk_live_abc123def456ghi789jkl012mno")).toBe(true);
    expect(regex.test("sk_test_abc123")).toBe(false);
  });

  it("should detect private key headers", () => {
    const pattern = BUILT_IN_PATTERNS.find((p) => p.name === "Private Key Header")!;
    const regex = new RegExp(pattern.regex);
    expect(regex.test("-----BEGIN RSA PRIVATE KEY-----")).toBe(true);
    expect(regex.test("-----BEGIN ED25519 PRIVATE KEY-----")).toBe(true);
    expect(regex.test("-----BEGIN PUBLIC KEY-----")).toBe(false);
  });

  it("should detect JWT tokens", () => {
    const pattern = BUILT_IN_PATTERNS.find((p) => p.name === "JWT Token")!;
    const regex = new RegExp(pattern.regex);
    expect(
      regex.test(
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
      ),
    ).toBe(true);
    expect(regex.test("not.a.jwt")).toBe(false);
  });

  it("should detect connection strings", () => {
    const pattern = BUILT_IN_PATTERNS.find((p) => p.name === "Database Connection String")!;
    const regex = new RegExp(pattern.regex, "i");
    expect(regex.test("postgres://user:pass@localhost:5432/mydb")).toBe(true);
    expect(regex.test("mongodb://admin:secret@mongo.example.com/db")).toBe(true);
    expect(regex.test("not a connection string")).toBe(false);
  });
});

describe("getCompiledBuiltInPatterns", () => {
  it("should return compiled patterns", () => {
    const compiled = getCompiledBuiltInPatterns();
    expect(compiled.length).toBe(BUILT_IN_PATTERNS.length);
    for (const p of compiled) {
      expect(p.compiled).toBeInstanceOf(RegExp);
    }
  });
});
