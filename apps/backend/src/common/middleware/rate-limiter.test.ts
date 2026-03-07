import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { rateLimiter, RateLimitStore } from "./rate-limiter";

describe("RateLimitStore", () => {
  let store: RateLimitStore;

  beforeEach(() => {
    store = new RateLimitStore(600_000);
  });

  afterEach(() => {
    store.destroy();
  });

  describe("hit", () => {
    it("should start count at 1 for a new key", () => {
      const result = store.hit("key1", 60_000);
      expect(result.count).toBe(1);
      expect(result.resetAt).toBeGreaterThan(Date.now() - 1);
    });

    it("should increment count for existing key within window", () => {
      store.hit("key1", 60_000);
      store.hit("key1", 60_000);
      const result = store.hit("key1", 60_000);
      expect(result.count).toBe(3);
    });

    it("should track different keys independently", () => {
      store.hit("key1", 60_000);
      store.hit("key1", 60_000);
      const result = store.hit("key2", 60_000);
      expect(result.count).toBe(1);
    });

    it("should reset count after window expires", async () => {
      store.hit("key1", 50);
      store.hit("key1", 50);
      await Bun.sleep(60);
      const result = store.hit("key1", 50);
      expect(result.count).toBe(1);
    });
  });

  describe("get", () => {
    it("should return undefined for unknown key", () => {
      expect(store.get("nonexistent")).toBeUndefined();
    });

    it("should return entry for active key", () => {
      store.hit("key1", 60_000);
      const entry = store.get("key1");
      expect(entry).toBeDefined();
      expect(entry!.count).toBe(1);
    });

    it("should return undefined for expired key", async () => {
      store.hit("key1", 50);
      await Bun.sleep(60);
      expect(store.get("key1")).toBeUndefined();
    });
  });

  describe("reset", () => {
    it("should remove a key from the store", () => {
      store.hit("key1", 60_000);
      store.reset("key1");
      expect(store.get("key1")).toBeUndefined();
    });
  });

  describe("size", () => {
    it("should return the number of entries", () => {
      store.hit("key1", 60_000);
      store.hit("key2", 60_000);
      expect(store.size).toBe(2);
    });
  });
});

describe("rateLimiter middleware", () => {
  let store: RateLimitStore;

  beforeEach(() => {
    store = new RateLimitStore(600_000);
  });

  afterEach(() => {
    store.destroy();
  });

  function createApp(max: number, windowMs: number) {
    return new Elysia()
      .use(rateLimiter({ max, windowMs, store, keyFn: () => "test-ip" }))
      .get("/test", () => ({ ok: true }));
  }

  it("should allow requests within the limit", async () => {
    const app = createApp(3, 60_000);
    const res = await app.handle(new Request("http://localhost/test"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-ratelimit-limit")).toBe("3");
    expect(res.headers.get("x-ratelimit-remaining")).toBe("2");
  });

  it("should return 429 when limit is exceeded", async () => {
    const app = createApp(2, 60_000);

    await app.handle(new Request("http://localhost/test"));
    await app.handle(new Request("http://localhost/test"));
    const res = await app.handle(new Request("http://localhost/test"));

    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeDefined();
    const body = (await res.json()) as { message: string };
    expect(body.message).toContain("Too many requests");
  });

  it("should set remaining to 0 at the limit", async () => {
    const app = createApp(2, 60_000);

    await app.handle(new Request("http://localhost/test"));
    const res = await app.handle(new Request("http://localhost/test"));

    expect(res.status).toBe(200);
    expect(res.headers.get("x-ratelimit-remaining")).toBe("0");
  });

  it("should allow requests again after window expires", async () => {
    const app = createApp(1, 50);

    await app.handle(new Request("http://localhost/test"));
    const blocked = await app.handle(new Request("http://localhost/test"));
    expect(blocked.status).toBe(429);

    await Bun.sleep(60);
    const allowed = await app.handle(new Request("http://localhost/test"));
    expect(allowed.status).toBe(200);
  });

  it("should use custom key function", async () => {
    let capturedKey = "";
    const app = new Elysia()
      .use(
        rateLimiter({
          max: 5,
          windowMs: 60_000,
          store,
          keyFn: (req) => {
            capturedKey = new URL(req.url).pathname;
            return capturedKey;
          },
        }),
      )
      .get("/custom", () => ({ ok: true }));

    await app.handle(new Request("http://localhost/custom"));
    expect(capturedKey).toBe("/custom");
  });

  it("should track different keys independently", async () => {
    let currentIp = "ip-1";
    const app = new Elysia()
      .use(
        rateLimiter({
          max: 1,
          windowMs: 60_000,
          store,
          keyFn: () => currentIp,
        }),
      )
      .get("/test", () => ({ ok: true }));

    await app.handle(new Request("http://localhost/test"));
    const blocked = await app.handle(new Request("http://localhost/test"));
    expect(blocked.status).toBe(429);

    currentIp = "ip-2";
    const allowed = await app.handle(new Request("http://localhost/test"));
    expect(allowed.status).toBe(200);
  });
});
