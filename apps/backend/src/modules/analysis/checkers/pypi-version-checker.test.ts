import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { fetchPypiVersion } from "./pypi-version-checker";
import { clearVersionCache } from "./version-cache";

describe("fetchPypiVersion", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearVersionCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should return latest version from PyPI", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ info: { version: "2.31.0", classifiers: [] } }), {
          status: 200,
        }),
      ),
    ) as unknown as typeof fetch;

    const result = await fetchPypiVersion("requests");

    expect(result.version).toBe("2.31.0");
    expect(result.deprecated).toBe(false);
  });

  it("should detect deprecated packages via classifiers", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            info: {
              version: "1.0.0",
              classifiers: [
                "Development Status :: 7 - Inactive",
                "Programming Language :: Python :: 3",
              ],
            },
          }),
          { status: 200 },
        ),
      ),
    ) as unknown as typeof fetch;

    const result = await fetchPypiVersion("old-python-pkg");

    expect(result.version).toBe("1.0.0");
    expect(result.deprecated).toBe(true);
  });

  it("should return null version for 404 responses", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Not Found", { status: 404 })),
    ) as unknown as typeof fetch;

    const result = await fetchPypiVersion("nonexistent-pkg");

    expect(result.version).toBeNull();
    expect(result.deprecated).toBe(false);
  });

  it("should return null version on network errors", async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new Error("Network error")),
    ) as unknown as typeof fetch;

    const result = await fetchPypiVersion("some-package");

    expect(result.version).toBeNull();
    expect(result.deprecated).toBe(false);
  });

  it("should use cached results on second call", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ info: { version: "3.0.0", classifiers: [] } }), {
          status: 200,
        }),
      ),
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await fetchPypiVersion("cached-pkg");
    await fetchPypiVersion("cached-pkg");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
