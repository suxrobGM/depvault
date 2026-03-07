import { afterAll, describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { noCacheHeaders } from "./no-cache.middleware";

describe("noCacheHeaders middleware", () => {
  const app = new Elysia()
    .get("/public", () => ({ data: "public" }))
    .use(
      new Elysia({ prefix: "/secrets" })
        .use(noCacheHeaders)
        .get("/data", () => ({ value: "secret" })),
    )
    .listen(0);

  const baseUrl = `http://${app.server!.hostname}:${app.server!.port}`;

  afterAll(() => {
    app.stop();
  });

  it("should set Cache-Control: no-store header", async () => {
    const res = await fetch(`${baseUrl}/secrets/data`);
    expect(res.headers.get("Cache-Control")).toBe("no-store, no-cache, must-revalidate");
  });

  it("should set Pragma: no-cache header", async () => {
    const res = await fetch(`${baseUrl}/secrets/data`);
    expect(res.headers.get("Pragma")).toBe("no-cache");
  });

  it("should set Expires: 0 header", async () => {
    const res = await fetch(`${baseUrl}/secrets/data`);
    expect(res.headers.get("Expires")).toBe("0");
  });

  it("should not affect routes outside the plugin scope", async () => {
    const publicRes = await fetch(`${baseUrl}/public`);
    expect(publicRes.headers.get("Cache-Control")).toBeNull();
  });
});
