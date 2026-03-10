import type { ICache } from "./cache.interface";

/**
 * In-process, TTL-based cache backed by a `Map`.
 *
 * Entries are evicted lazily on `get` — there is no background sweep.
 * Suitable for single-process workloads; replace with a `RedisCache`
 * implementation for multi-instance deployments.
 *
 * @example
 * ```ts
 * const cache = new MemoryCache<string>(60_000); // 1-minute default TTL
 * cache.set("key", "value");
 * cache.get("key"); // "value"
 * ```
 */
export class MemoryCache<T> implements ICache<T> {
  private readonly entries = new Map<string, { value: T; expiresAt: number }>();

  /**
   * @param defaultTtlMs - Default TTL in milliseconds applied when `set` is
   *   called without an explicit `ttlMs` argument.
   */
  constructor(private readonly defaultTtlMs: number) {}

  get(key: string): T | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}
