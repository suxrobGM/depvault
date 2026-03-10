import { logger } from "@/common/logger";
import { versionCache } from "./version-cache";
import type { RegistryResult } from "./version-utils";

const REQUEST_TIMEOUT_MS = 5000;

export async function fetchPypiVersion(name: string): Promise<RegistryResult> {
  const cached = versionCache.get(`pypi:${name}`);
  if (cached) return cached;

  try {
    const response = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return { version: null, deprecated: false };

    const data = (await response.json()) as {
      info?: { version?: string; classifiers?: string[] };
    };

    const version = data.info?.version ?? null;
    const classifiers = data.info?.classifiers ?? [];
    const deprecated = classifiers.some(
      (c: string) => c.toLowerCase().includes("inactive") || c.toLowerCase().includes("deprecated"),
    );

    const result: RegistryResult = { version, deprecated };
    versionCache.set(`pypi:${name}`, result);
    return result;
  } catch {
    logger.warn(`Failed to fetch PyPI version for ${name}`);
    return { version: null, deprecated: false };
  }
}
