/**
 * Generic cache abstraction. Implement this interface to swap the backing
 * store (e.g. in-memory → Redis) without touching call sites.
 */
export interface ICache<T> {
  /**
   * Returns the cached value for `key`, or `null` if missing or expired.
   */
  get(key: string): T | null;

  /**
   * Stores `value` under `key`.
   * @param ttlMs - Time-to-live in milliseconds. Falls back to the instance default when omitted.
   */
  set(key: string, value: T, ttlMs?: number): void;

  /** Removes the entry for `key`. No-op if the key does not exist. */
  delete(key: string): void;

  /** Removes all entries from the cache. */
  clear(): void;
}
