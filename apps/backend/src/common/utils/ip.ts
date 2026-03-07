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
