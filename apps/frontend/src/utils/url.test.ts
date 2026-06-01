import { describe, expect, it } from "vitest";
import { safeRedirect } from "./url";

describe("safeRedirect", () => {
  it("accepts a root-relative path (incl. query string)", () => {
    expect(safeRedirect("/cli/verify?code=ABCD-EFGH")).toBe("/cli/verify?code=ABCD-EFGH");
    expect(safeRedirect("/overview")).toBe("/overview");
  });

  it("rejects empty or missing values", () => {
    expect(safeRedirect(null)).toBeNull();
    expect(safeRedirect(undefined)).toBeNull();
    expect(safeRedirect("")).toBeNull();
  });

  it("rejects absolute and protocol-relative URLs (open-redirect guard)", () => {
    expect(safeRedirect("https://evil.example")).toBeNull();
    expect(safeRedirect("//evil.example")).toBeNull();
    expect(safeRedirect("/\\evil.example")).toBeNull();
    expect(safeRedirect("evil")).toBeNull();
  });
});
