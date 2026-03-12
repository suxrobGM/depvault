import { logger } from "@/common/logger";
import { versionCache } from "./version-cache";
import type { RegistryResult } from "./version-utils";

const REQUEST_TIMEOUT_MS = 5000;

/** Fetches the latest version info from Maven Central for a group:artifact dependency. */
export async function fetchMavenVersion(name: string): Promise<RegistryResult> {
  if (!name) {
    return { version: null, deprecated: false, license: null };
  }

  const cached = versionCache.get(`maven:${name}`);
  if (cached) return cached;

  const [group, artifact] = name.includes(":") ? name.split(":") : [null, null];
  if (!group || !artifact) {
    return { version: null, deprecated: false, license: null };
  }

  try {
    const response = await fetch(
      `https://search.maven.org/solrsearch/select?q=g:${encodeURIComponent(group)}+AND+a:${encodeURIComponent(artifact)}&rows=1&wt=json`,
      {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: { Accept: "application/json" },
      },
    );

    if (!response.ok) return { version: null, deprecated: false, license: null };

    const data = (await response.json()) as {
      response?: { docs?: Array<{ latestVersion?: string }> };
    };

    const doc = data.response?.docs?.[0];
    const version = doc?.latestVersion ?? null;

    const result: RegistryResult = {
      version,
      deprecated: false,
      license: null,
    };

    versionCache.set(`maven:${name}`, result);
    return result;
  } catch {
    logger.warn(`Failed to fetch Maven version for ${name}`);
    return { version: null, deprecated: false, license: null };
  }
}
