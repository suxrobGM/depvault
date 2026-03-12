import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { fetchNugetVersion } from "./nuget-version-checker";
import { clearVersionCache } from "./version-cache";

describe("fetchNugetVersion", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearVersionCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should return latest stable version from NuGet", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ versions: ["12.0.1", "12.0.2", "13.0.3"] }), { status: 200 }),
      ),
    ) as unknown as typeof fetch;

    const result = await fetchNugetVersion("Newtonsoft.Json");

    expect(result.version).toBe("13.0.3");
    expect(result.deprecated).toBe(false);
  });

  it("should prefer stable over prerelease versions", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ versions: ["8.0.0", "9.0.0-preview.1"] }), { status: 200 }),
      ),
    ) as unknown as typeof fetch;

    const result = await fetchNugetVersion("Microsoft.EntityFrameworkCore");

    expect(result.version).toBe("8.0.0");
  });

  it("should fall back to prerelease if no stable exists", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ versions: ["1.0.0-beta.1", "1.0.0-rc.1"] }), { status: 200 }),
      ),
    ) as unknown as typeof fetch;

    const result = await fetchNugetVersion("SomePrerelease");

    expect(result.version).toBe("1.0.0-rc.1");
  });

  it("should return null version for 404 responses", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Not Found", { status: 404 })),
    ) as unknown as typeof fetch;

    const result = await fetchNugetVersion("nonexistent-pkg");

    expect(result.version).toBeNull();
    expect(result.deprecated).toBe(false);
  });

  it("should return null version on network errors", async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new Error("Network error")),
    ) as unknown as typeof fetch;

    const result = await fetchNugetVersion("some-package");

    expect(result.version).toBeNull();
  });

  it("should use cached results on second call", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ versions: ["1.0.0"] }), { status: 200 })),
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await fetchNugetVersion("cached-pkg");
    await fetchNugetVersion("cached-pkg");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should return null for empty name", async () => {
    const result = await fetchNugetVersion("");
    expect(result.version).toBeNull();
  });
});
