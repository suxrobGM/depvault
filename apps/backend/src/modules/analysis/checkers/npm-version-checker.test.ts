import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { fetchNpmVersion } from "./npm-version-checker";
import { clearVersionCache } from "./version-cache";

describe("fetchNpmVersion", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearVersionCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should return latest version from npm registry", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ version: "4.21.0" }), { status: 200 })),
    ) as unknown as typeof fetch;

    const result = await fetchNpmVersion("express");

    expect(result.version).toBe("4.21.0");
    expect(result.deprecated).toBe(false);
  });

  it("should detect deprecated packages", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ version: "1.0.0", deprecated: "Use something else" }), {
          status: 200,
        }),
      ),
    ) as unknown as typeof fetch;

    const result = await fetchNpmVersion("old-package");

    expect(result.version).toBe("1.0.0");
    expect(result.deprecated).toBe(true);
  });

  it("should return null version for 404 responses", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Not Found", { status: 404 })),
    ) as unknown as typeof fetch;

    const result = await fetchNpmVersion("nonexistent-pkg");

    expect(result.version).toBeNull();
    expect(result.deprecated).toBe(false);
  });

  it("should return null version on network errors", async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new Error("Network error")),
    ) as unknown as typeof fetch;

    const result = await fetchNpmVersion("some-package");

    expect(result.version).toBeNull();
    expect(result.deprecated).toBe(false);
  });

  it("should use cached results on second call", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ version: "2.0.0" }), { status: 200 })),
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await fetchNpmVersion("cached-pkg");
    await fetchNpmVersion("cached-pkg");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should encode scoped package names correctly", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ version: "20.0.0" }), { status: 200 })),
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await fetchNpmVersion("@types/node");

    const calledUrl = (mockFetch.mock.calls[0] as unknown as [string])[0];
    expect(calledUrl).toContain("@types%2Fnode");
  });
});
