interface CacheEntry {
  latestVersion: string | null;
  deprecated: boolean;
  expiresAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const cache = new Map<string, CacheEntry>();

export function getCached(key: string): { version: string | null; deprecated: boolean } | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return { version: entry.latestVersion, deprecated: entry.deprecated };
  }
  return null;
}

export function setCache(key: string, version: string | null, deprecated: boolean): void {
  cache.set(key, {
    latestVersion: version,
    deprecated,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function clearVersionCache(): void {
  cache.clear();
}
