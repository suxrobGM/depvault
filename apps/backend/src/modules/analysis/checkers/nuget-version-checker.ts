import { logger } from "@/common/logger";
import { versionCache } from "./version-cache";
import type { RegistryResult } from "./version-utils";

const REQUEST_TIMEOUT_MS = 5000;

/** Fetches the latest version info for a NuGet package. */
export async function fetchNugetVersion(name: string): Promise<RegistryResult> {
  if (!name) {
    return { version: null, deprecated: false, license: null };
  }

  const cached = versionCache.get(`nuget:${name}`);
  if (cached) return cached;

  try {
    const lowerName = name.toLowerCase();
    const response = await fetch(
      `https://api.nuget.org/v3-flatcontainer/${encodeURIComponent(lowerName)}/index.json`,
      {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: { Accept: "application/json" },
      },
    );

    if (!response.ok) return { version: null, deprecated: false, license: null };

    const data = (await response.json()) as { versions?: string[] };
    const versions = data.versions ?? [];
    const latestVersion = findLatestStable(versions);

    const result: RegistryResult = {
      version: latestVersion,
      deprecated: false,
      license: null,
    };

    versionCache.set(`nuget:${name}`, result);
    return result;
  } catch {
    logger.warn(`Failed to fetch NuGet version for ${name}`);
    return { version: null, deprecated: false, license: null };
  }
}

function findLatestStable(versions: string[]): string | null {
  if (versions.length === 0) return null;

  // Prefer stable versions (no prerelease suffix)
  for (let i = versions.length - 1; i >= 0; i--) {
    if (!isPrerelease(versions[i]!)) return versions[i]!;
  }

  // Fall back to the latest version regardless
  return versions[versions.length - 1]!;
}

function isPrerelease(version: string): boolean {
  return /[-]/.test(version);
}
