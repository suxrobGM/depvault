import { describe, expect, it } from "vitest";
import { containsDetectedSecret } from "./detect-secret";

describe("containsDetectedSecret", () => {
  it("detects secrets inside .env text but ignores plain config", () => {
    expect(containsDetectedSecret("PORT=3000\nSTRIPE_KEY=sk_live_51StM3GE7bSeaMJ", "env")).toBe(
      true,
    );
    expect(containsDetectedSecret("PORT=3000\nHOST=localhost", "env")).toBe(false);
  });

  it("detects secrets inside JSON config", () => {
    const json = '{\n  "Stripe": {\n    "SecretKey": "sk_live_51StM3GE7bSeaMJBmoBw"\n  }\n}';
    expect(containsDetectedSecret(json, "json")).toBe(true);
    expect(containsDetectedSecret('{ "Port": 3000 }', "json")).toBe(false);
  });

  it("detects token shapes embedded in XML attributes", () => {
    expect(containsDetectedSecret('<add key="ApiKey" value="AKIAIOSFODNN7EXAMPLE" />', "xml")).toBe(
      true,
    );
  });
});
