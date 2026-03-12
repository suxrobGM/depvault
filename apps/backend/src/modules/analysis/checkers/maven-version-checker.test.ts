import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { fetchMavenVersion } from "./maven-version-checker";
import { clearVersionCache } from "./version-cache";

describe("fetchMavenVersion", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearVersionCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should return latest version from Maven Central", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            response: { docs: [{ latestVersion: "2.3.7" }] },
          }),
          { status: 200 },
        ),
      ),
    ) as unknown as typeof fetch;

    const result = await fetchMavenVersion("io.ktor:ktor-client-core");

    expect(result.version).toBe("2.3.7");
    expect(result.deprecated).toBe(false);
  });

  it("should return null for packages without group:artifact format", async () => {
    const result = await fetchMavenVersion("invalid-name");

    expect(result.version).toBeNull();
  });

  it("should return null version for 404 responses", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Not Found", { status: 404 })),
    ) as unknown as typeof fetch;

    const result = await fetchMavenVersion("com.example:nonexistent");

    expect(result.version).toBeNull();
  });

  it("should return null version on network errors", async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new Error("Network error")),
    ) as unknown as typeof fetch;

    const result = await fetchMavenVersion("com.example:some-lib");

    expect(result.version).toBeNull();
  });

  it("should use cached results on second call", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            response: { docs: [{ latestVersion: "1.0.0" }] },
          }),
          { status: 200 },
        ),
      ),
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await fetchMavenVersion("com.example:cached");
    await fetchMavenVersion("com.example:cached");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should return null for empty name", async () => {
    const result = await fetchMavenVersion("");
    expect(result.version).toBeNull();
  });

  it("should handle empty response docs", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ response: { docs: [] } }), { status: 200 })),
    ) as unknown as typeof fetch;

    const result = await fetchMavenVersion("com.example:empty");

    expect(result.version).toBeNull();
  });
});
