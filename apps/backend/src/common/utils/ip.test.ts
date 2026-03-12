import { describe, expect, it, mock } from "bun:test";
import { getClientIp, isIpInAllowlist, validateIpAllowlist } from "./ip";

describe("getClientIp", () => {
  it("should return the first IP from x-forwarded-for header", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(getClientIp(request, null)).toBe("203.0.113.1");
  });

  it("should trim whitespace from forwarded IP", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "  203.0.113.1 , 10.0.0.1" },
    });
    expect(getClientIp(request, null)).toBe("203.0.113.1");
  });

  it("should fall back to server.requestIP when no forwarded header", () => {
    const request = new Request("http://localhost");
    const server = { requestIP: mock(() => ({ address: "192.168.1.1" })) };
    expect(getClientIp(request, server)).toBe("192.168.1.1");
  });

  it("should return 'unknown' when no IP is available", () => {
    const request = new Request("http://localhost");
    expect(getClientIp(request, null)).toBe("unknown");
  });

  it("should return 'unknown' when server.requestIP returns null", () => {
    const request = new Request("http://localhost");
    const server = { requestIP: mock(() => null) };
    expect(getClientIp(request, server)).toBe("unknown");
  });
});

describe("isIpInAllowlist", () => {
  it("should return true for empty allowlist", () => {
    expect(isIpInAllowlist("1.2.3.4", [])).toBe(true);
  });

  it("should match exact IPv4 address", () => {
    expect(isIpInAllowlist("10.0.0.1", ["10.0.0.1"])).toBe(true);
  });

  it("should reject non-matching exact IPv4", () => {
    expect(isIpInAllowlist("10.0.0.2", ["10.0.0.1"])).toBe(false);
  });

  it("should match IP within CIDR /24 range", () => {
    expect(isIpInAllowlist("192.168.1.50", ["192.168.1.0/24"])).toBe(true);
  });

  it("should reject IP outside CIDR /24 range", () => {
    expect(isIpInAllowlist("192.168.2.50", ["192.168.1.0/24"])).toBe(false);
  });

  it("should match IP within CIDR /16 range", () => {
    expect(isIpInAllowlist("10.1.2.3", ["10.0.0.0/8"])).toBe(true);
  });

  it("should reject IP outside CIDR /8 range", () => {
    expect(isIpInAllowlist("11.0.0.1", ["10.0.0.0/8"])).toBe(false);
  });

  it("should match when any entry in allowlist matches", () => {
    expect(isIpInAllowlist("172.16.0.5", ["10.0.0.1", "172.16.0.0/16"])).toBe(true);
  });

  it("should normalize IPv4-mapped IPv6 addresses", () => {
    expect(isIpInAllowlist("::ffff:10.0.0.1", ["10.0.0.1"])).toBe(true);
  });

  it("should normalize allowlist entries with IPv4-mapped IPv6", () => {
    expect(isIpInAllowlist("10.0.0.1", ["::ffff:10.0.0.1"])).toBe(true);
  });

  it("should match /32 CIDR (single host)", () => {
    expect(isIpInAllowlist("10.0.0.1", ["10.0.0.1/32"])).toBe(true);
    expect(isIpInAllowlist("10.0.0.2", ["10.0.0.1/32"])).toBe(false);
  });

  it("should match /0 CIDR (all IPs)", () => {
    expect(isIpInAllowlist("255.255.255.255", ["0.0.0.0/0"])).toBe(true);
  });
});

describe("validateIpAllowlist", () => {
  it("should return null for valid IPs", () => {
    expect(validateIpAllowlist(["10.0.0.1", "192.168.1.1"])).toBeNull();
  });

  it("should return null for valid CIDR entries", () => {
    expect(validateIpAllowlist(["10.0.0.0/8", "192.168.1.0/24"])).toBeNull();
  });

  it("should return null for empty array", () => {
    expect(validateIpAllowlist([])).toBeNull();
  });

  it("should return error for invalid IP address", () => {
    const result = validateIpAllowlist(["not-an-ip"]);
    expect(result).toBe("Invalid IP address: not-an-ip");
  });

  it("should return error for invalid CIDR IP", () => {
    const result = validateIpAllowlist(["bad-ip/24"]);
    expect(result).toBe("Invalid IP in CIDR: bad-ip/24");
  });

  it("should return error for out-of-range prefix length", () => {
    const result = validateIpAllowlist(["10.0.0.0/33"]);
    expect(result).toBe("Invalid prefix length in CIDR: 10.0.0.0/33");
  });

  it("should return error for negative prefix length", () => {
    const result = validateIpAllowlist(["10.0.0.0/-1"]);
    expect(result).toBe("Invalid prefix length in CIDR: 10.0.0.0/-1");
  });

  it("should return error for non-numeric prefix", () => {
    const result = validateIpAllowlist(["10.0.0.0/abc"]);
    expect(result).toBe("Invalid prefix length in CIDR: 10.0.0.0/abc");
  });

  it("should return error for malformed CIDR with missing prefix", () => {
    const result = validateIpAllowlist(["10.0.0.0/"]);
    expect(result).toBe("Invalid CIDR: 10.0.0.0/");
  });

  it("should validate mixed valid entries", () => {
    expect(validateIpAllowlist(["10.0.0.1", "192.168.0.0/16", "172.16.0.1"])).toBeNull();
  });

  it("should return first error in list with multiple invalid entries", () => {
    const result = validateIpAllowlist(["10.0.0.1", "bad", "also-bad"]);
    expect(result).toBe("Invalid IP address: bad");
  });
});
