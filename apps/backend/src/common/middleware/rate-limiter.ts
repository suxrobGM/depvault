import { Elysia } from "elysia";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory fixed-window rate limit store.
 * Tracks request counts per key and automatically purges expired entries.
 */
export class RateLimitStore {
  private readonly store = new Map<string, RateLimitEntry>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  /** @param cleanupIntervalMs How often (ms) to purge expired entries. */
  constructor(cleanupIntervalMs = 60_000) {
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  /** Increment the counter for `key`. Resets automatically after `windowMs`. */
  hit(key: string, windowMs: number): { count: number; resetAt: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetAt) {
      const newEntry = { count: 1, resetAt: now + windowMs };
      this.store.set(key, newEntry);
      return newEntry;
    }

    entry.count++;
    return entry;
  }

  /** Return the current entry for `key`, or `undefined` if expired / missing. */
  get(key: string): RateLimitEntry | undefined {
    const now = Date.now();
    const entry = this.store.get(key);
    if (entry && now >= entry.resetAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  /** Remove a key's counter immediately. */
  reset(key: string): void {
    this.store.delete(key);
  }

  /** Number of tracked keys (includes expired entries not yet cleaned up). */
  get size(): number {
    return this.store.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  /** Stop the cleanup timer and clear all entries. */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

const globalStore = new RateLimitStore();

export interface RateLimitOptions {
  /** Maximum number of requests allowed within the window. */
  max: number;
  /** Time window in milliseconds. */
  windowMs: number;
  /** Custom function to derive the rate-limit key (defaults to client IP). */
  keyFn?: (request: Request, server: any) => string;
  /** Store instance to use (defaults to a shared global store). */
  store?: RateLimitStore;
}

function getClientIp(request: Request, server: any): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  if (server?.requestIP) {
    const addr = server.requestIP(request);
    if (addr?.address) return addr.address;
  }

  return "unknown";
}

/**
 * Elysia plugin that rate-limits requests using a fixed-window counter.
 *
 * Sets `x-ratelimit-limit`, `x-ratelimit-remaining`, and `x-ratelimit-reset`
 * headers on every response. Returns 429 with a `retry-after` header when the
 * limit is exceeded.
 *
 * Scoped — wrap in `new Elysia().use(rateLimiter(...))` to isolate to
 * specific routes.
 *
 * @example
 * ```ts
 * new Elysia()
 *   .use(rateLimiter({ max: 5, windowMs: 60_000 }))
 *   .post("/login", handler)
 * ```
 */
export function rateLimiter(options: RateLimitOptions) {
  const { max, windowMs, store = globalStore } = options;
  const keyFn = options.keyFn ?? ((req: Request, server: any) => getClientIp(req, server));

  return new Elysia({ name: `rate-limiter-${max}-${windowMs}` }).onBeforeHandle(
    { as: "scoped" },
    ({ request, set, server }) => {
      if (process.env.NODE_ENV === "development") {
        return;
      }

      const key = keyFn(request, server);
      const { count, resetAt } = store.hit(key, windowMs);

      const remaining = Math.max(0, max - count);
      const retryAfterSeconds = Math.ceil((resetAt - Date.now()) / 1000);

      set.headers["x-ratelimit-limit"] = String(max);
      set.headers["x-ratelimit-remaining"] = String(remaining);
      set.headers["x-ratelimit-reset"] = String(Math.ceil(resetAt / 1000));

      if (count > max) {
        set.headers["retry-after"] = String(retryAfterSeconds);
        set.status = 429;
        return { code: 429, message: "Too many requests, please try again later" };
      }
    },
  );
}
