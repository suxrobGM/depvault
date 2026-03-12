import { logger } from "@/common/logger";
import { versionCache } from "./version-cache";
import type { RegistryResult } from "./version-utils";

const REQUEST_TIMEOUT_MS = 5000;

export async function fetchNpmVersion(name: string): Promise<RegistryResult> {
  if (!name) {
    return { version: null, deprecated: false, license: null };
  }

  const cached = versionCache.get(`npm:${name}`);
  if (cached) return cached;

  try {
    const encodedName = name.startsWith("@")
      ? `@${encodeURIComponent(name.slice(1))}`
      : encodeURIComponent(name);
    const response = await fetch(`https://registry.npmjs.org/${encodedName}/latest`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return { version: null, deprecated: false, license: null };

    const data = (await response.json()) as {
      version?: string;
      deprecated?: string;
      license?: string | { type?: string };
    };

    const rawLicense = data.license;

    const license =
      typeof rawLicense === "string"
        ? rawLicense
        : typeof rawLicense === "object" && rawLicense?.type
          ? rawLicense.type
          : null;

    const result: RegistryResult = {
      version: data.version ?? null,
      deprecated: !!data.deprecated,
      license,
    };

    versionCache.set(`npm:${name}`, result);
    return result;
  } catch {
    logger.warn(`Failed to fetch npm version for ${name}`);
    return { version: null, deprecated: false, license: null };
  }
}
