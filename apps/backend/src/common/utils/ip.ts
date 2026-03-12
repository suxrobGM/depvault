import { isIP } from "node:net";

/**
 * Get the client's IP address from the request, considering possible proxies.
 * @param request The incoming request object.
 * @param server The server instance, used as a fallback to get the IP if no forwarded header is present.
 * @returns The client's IP address as a string, or "unknown" if it cannot be determined.
 */
export function getClientIp(
  request: Request,
  server: { requestIP(req: Request): { address: string } | null } | null,
): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0];
    if (first) return first.trim();
  }

  if (server) {
    const addr = server.requestIP(request);
    if (addr) return addr.address;
  }

  return "unknown";
}

/** Checks whether a client IP matches any entry in an allowlist (exact or CIDR). */
export function isIpInAllowlist(clientIp: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) {
    return true;
  }

  const normalized = normalizeIp(clientIp);
  return allowlist.some((entry) =>
    entry.includes("/") ? isIpInCidr(normalized, entry) : normalizeIp(entry) === normalized,
  );
}

/** Validates that every entry is a valid IP or CIDR notation. Returns error message or null. */
export function validateIpAllowlist(entries: string[]): string | null {
  for (const entry of entries) {
    if (entry.includes("/")) {
      const [ip, prefix] = entry.split("/");

      if (!ip || !prefix) {
        return `Invalid CIDR: ${entry}`;
      }
      if (!isIP(ip)) {
        return `Invalid IP in CIDR: ${entry}`;
      }

      const bits = Number(prefix);
      const maxBits = isIP(ip) === 6 ? 128 : 32;

      if (Number.isNaN(bits) || bits < 0 || bits > maxBits) {
        return `Invalid prefix length in CIDR: ${entry}`;
      }
    } else {
      if (!isIP(entry)) return `Invalid IP address: ${entry}`;
    }
  }
  return null;
}

function normalizeIp(ip: string): string {
  if (ip.startsWith("::ffff:")) {
    return ip.slice(7);
  }
  return ip;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const [cidrIp, prefixStr] = cidr.split("/");
  if (!cidrIp || !prefixStr) {
    return false;
  }

  const prefix = Number(prefixStr);
  const normalizedCidrIp = normalizeIp(cidrIp);

  if (isIP(ip) === 4 && isIP(normalizedCidrIp) === 4) {
    return ipv4InCidr(ip, normalizedCidrIp, prefix);
  }

  return false;
}

function ipv4InCidr(ip: string, cidrIp: string, prefix: number): boolean {
  const ipNum = ipv4ToNumber(ip);
  const cidrNum = ipv4ToNumber(cidrIp);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipNum & mask) === (cidrNum & mask);
}

function ipv4ToNumber(ip: string): number {
  const parts = ip.split(".");
  return (
    ((Number(parts[0]) << 24) |
      (Number(parts[1]) << 16) |
      (Number(parts[2]) << 8) |
      Number(parts[3])) >>>
    0
  );
}
