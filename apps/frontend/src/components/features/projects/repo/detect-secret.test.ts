import { describe, expect, it } from "vitest";
import { containsDetectedSecret } from "./detect-secret";

// Token assembled at runtime so no scannable secret literal lands in committed
// source (gitleaks / push protection scan text, not runtime values). Not a real key.
const FAKE_STRIPE = "sk_live_" + "EXAMPLE0fake0body0value0xyz";

describe("containsDetectedSecret", () => {
  it("detects secrets inside .env text but ignores plain config", () => {
    expect(containsDetectedSecret(`PORT=3000\nSTRIPE_KEY=${FAKE_STRIPE}`, "env")).toBe(true);
    expect(containsDetectedSecret("PORT=3000\nHOST=localhost", "env")).toBe(false);
  });

  it("detects secrets inside JSON config", () => {
    const json = `{\n  "Stripe": {\n    "SecretKey": "${FAKE_STRIPE}"\n  }\n}`;
    expect(containsDetectedSecret(json, "json")).toBe(true);
    expect(containsDetectedSecret('{ "Port": 3000 }', "json")).toBe(false);
  });

  it("detects token shapes embedded in XML attributes", () => {
    expect(containsDetectedSecret('<add key="ApiKey" value="AKIAIOSFODNN7EXAMPLE" />', "xml")).toBe(
      true,
    );
  });
});
