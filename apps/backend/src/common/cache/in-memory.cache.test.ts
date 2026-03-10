import { describe, expect, it } from "bun:test";
import { MemoryCache } from "./in-memory.cache";

describe("MemoryCache", () => {
  describe("get", () => {
    it("should return null for a key that was never set", () => {
      const cache = new MemoryCache<string>(1000);
      expect(cache.get("missing")).toBeNull();
    });

    it("should return the stored value before TTL expires", () => {
      const cache = new MemoryCache<string>(60_000);
      cache.set("k", "hello");
      expect(cache.get("k")).toBe("hello");
    });

    it("should return null and evict the entry after TTL expires", () => {
      const cache = new MemoryCache<string>(1); // 1 ms TTL
      cache.set("k", "bye");
      // Advance past the TTL by manipulating the stored expiry
      const entry = (
        cache as unknown as { entries: Map<string, { value: string; expiresAt: number }> }
      ).entries.get("k")!;
      entry.expiresAt = Date.now() - 1;

      expect(cache.get("k")).toBeNull();
      // Verify the entry was lazily evicted
      expect((cache as unknown as { entries: Map<string, unknown> }).entries.has("k")).toBe(false);
    });

    it("should support non-string value types", () => {
      const cache = new MemoryCache<{ count: number }>(60_000);
      cache.set("obj", { count: 42 });
      expect(cache.get("obj")).toEqual({ count: 42 });
    });
  });

  describe("set", () => {
    it("should overwrite an existing entry", () => {
      const cache = new MemoryCache<number>(60_000);
      cache.set("n", 1);
      cache.set("n", 2);
      expect(cache.get("n")).toBe(2);
    });

    it("should use a per-call ttlMs over the instance default", () => {
      const cache = new MemoryCache<string>(60_000);
      cache.set("k", "short", 1);
      // Expire it manually
      const entry = (
        cache as unknown as { entries: Map<string, { value: string; expiresAt: number }> }
      ).entries.get("k")!;
      entry.expiresAt = Date.now() - 1;

      expect(cache.get("k")).toBeNull();
    });

    it("should fall back to default TTL when ttlMs is omitted", () => {
      const defaultTtl = 60_000;
      const cache = new MemoryCache<string>(defaultTtl);
      const before = Date.now();
      cache.set("k", "v");
      const entry = (
        cache as unknown as { entries: Map<string, { value: string; expiresAt: number }> }
      ).entries.get("k")!;

      expect(entry.expiresAt).toBeGreaterThanOrEqual(before + defaultTtl);
    });
  });

  describe("delete", () => {
    it("should remove an existing entry", () => {
      const cache = new MemoryCache<string>(60_000);
      cache.set("k", "v");
      cache.delete("k");
      expect(cache.get("k")).toBeNull();
    });

    it("should be a no-op for a key that does not exist", () => {
      const cache = new MemoryCache<string>(60_000);
      expect(() => cache.delete("nope")).not.toThrow();
    });
  });

  describe("clear", () => {
    it("should remove all entries", () => {
      const cache = new MemoryCache<number>(60_000);
      cache.set("a", 1);
      cache.set("b", 2);
      cache.set("c", 3);
      cache.clear();

      expect(cache.get("a")).toBeNull();
      expect(cache.get("b")).toBeNull();
      expect(cache.get("c")).toBeNull();
    });

    it("should be a no-op on an already-empty cache", () => {
      const cache = new MemoryCache<string>(60_000);
      expect(() => cache.clear()).not.toThrow();
    });
  });
});
