import { describe, expect, it } from "vitest";
import { looksLikeSecret, shannonEntropy } from "./detect-secret";

// Fixtures exercise real secret SHAPES, but the recognizable prefix and body are
// joined at runtime so no scannable token literal lands in committed source
// (GitHub push protection scans text, not runtime values). These are not real keys.
const FAKE_BODY = "EXAMPLE0fake0body0value0xyz";

describe("looksLikeSecret", () => {
  it("flags known credential token prefixes", () => {
    expect(looksLikeSecret(`sk_live_${FAKE_BODY}`)).toBe(true);
    expect(looksLikeSecret(`ghp_${FAKE_BODY}`)).toBe(true);
    expect(looksLikeSecret("AKIAIOSFODNN7EXAMPLE")).toBe(true);
    expect(looksLikeSecret(`GOCSPX-${FAKE_BODY}`)).toBe(true);
    expect(looksLikeSecret("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.dQw4w9Wg")).toBe(
      true,
    );
  });

  it("flags values whose key name implies a secret", () => {
    expect(looksLikeSecret("changeme123please", "BotToken")).toBe(true);
    expect(looksLikeSecret("hunter2hunter2", "MasterPassword")).toBe(true);
    expect(looksLikeSecret("anything-here-ok", "Stripe.WebhookSecret")).toBe(true);
  });

  it("flags high-entropy random blobs", () => {
    expect(looksLikeSecret("b7c90453a2e2b3677e4244f6b3556469f85819343")).toBe(true);
  });

  it("flags values with embedded credentials (connection strings, URIs)", () => {
    expect(
      looksLikeSecret(
        '"Host=85.239.241.213;Port=5432;Database=master_logistics;Username=postgres;Password=s3cr3t"',
        "ConnectionStrings__MasterDatabase",
      ),
    ).toBe(true);
    expect(looksLikeSecret("DefaultEndpointsProtocol=https;AccountKey=abc123==")).toBe(true);
    expect(looksLikeSecret("postgres://user:p4ss@host:5432/db")).toBe(true);
  });

  it("does not flag credential-free connection details", () => {
    expect(looksLikeSecret("85.239.241.213", "TenantDatabaseDefaults__Host")).toBe(false);
    expect(looksLikeSecret("postgres", "TenantDatabaseDefaults__UserId")).toBe(false);
  });

  it("does not flag obvious non-secrets", () => {
    expect(looksLikeSecret("3000")).toBe(false);
    expect(looksLikeSecret("true")).toBe(false);
    expect(looksLikeSecret("localhost")).toBe(false);
    expect(looksLikeSecret("https://tms.logisticsx.app")).toBe(false);
    expect(looksLikeSecret("noreply@logisticsx.app")).toBe(false);
    expect(looksLikeSecret("")).toBe(false);
    expect(looksLikeSecret("LogisticsX", "SenderName")).toBe(false);
  });

  it("does not flag a low-entropy client id with dots", () => {
    const clientId = `${"000000000000"}-${FAKE_BODY.toLowerCase()}.apps.googleusercontent.com`;
    expect(looksLikeSecret(clientId, "ClientId")).toBe(false);
  });
});

describe("shannonEntropy", () => {
  it("is zero for a single repeated character and higher for varied input", () => {
    expect(shannonEntropy("aaaaaaaa")).toBe(0);
    expect(shannonEntropy("a1B2c3D4e5F6")).toBeGreaterThan(3);
  });
});
