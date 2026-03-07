import { describe, expect, it } from "bun:test";
import { cleanVersion, compareVersions } from "./version-utils";

describe("cleanVersion", () => {
  it("should strip caret prefix", () => {
    expect(cleanVersion("^4.18.2")).toBe("4.18.2");
  });

  it("should strip tilde prefix", () => {
    expect(cleanVersion("~4.17.21")).toBe("4.17.21");
  });

  it("should strip >= prefix", () => {
    expect(cleanVersion(">=1.0.0")).toBe("1.0.0");
  });

  it("should handle Python version specifiers with comma", () => {
    expect(cleanVersion(">=1.0.0,<2.0.0")).toBe("1.0.0");
  });

  it("should handle == prefix", () => {
    expect(cleanVersion("==2.3.0")).toBe("2.3.0");
  });

  it("should handle bare version", () => {
    expect(cleanVersion("1.2.3")).toBe("1.2.3");
  });

  it("should handle wildcard by stripping it", () => {
    expect(cleanVersion("*")).toBe("");
  });
});

describe("compareVersions", () => {
  it("should return UP_TO_DATE when versions match", () => {
    expect(compareVersions("4.18.2", "4.18.2", false)).toBe("UP_TO_DATE");
  });

  it("should return MAJOR_UPDATE when major differs", () => {
    expect(compareVersions("^4.18.2", "5.0.0", false)).toBe("MAJOR_UPDATE");
  });

  it("should return MINOR_UPDATE when minor differs", () => {
    expect(compareVersions("^4.17.0", "4.18.2", false)).toBe("MINOR_UPDATE");
  });

  it("should return MINOR_UPDATE when only patch differs", () => {
    expect(compareVersions("^4.18.0", "4.18.3", false)).toBe("MINOR_UPDATE");
  });

  it("should return DEPRECATED when deprecated flag is set", () => {
    expect(compareVersions("1.0.0", "1.0.0", true)).toBe("DEPRECATED");
  });

  it("should return UP_TO_DATE for unparseable versions", () => {
    expect(compareVersions("latest", "1.0.0", false)).toBe("UP_TO_DATE");
  });

  it("should handle two-segment versions", () => {
    expect(compareVersions("1.0", "2.0", false)).toBe("MAJOR_UPDATE");
  });

  it("should handle single-segment versions", () => {
    expect(compareVersions("1", "2", false)).toBe("MAJOR_UPDATE");
  });

  it("should return UP_TO_DATE when current is newer", () => {
    expect(compareVersions("5.0.0", "4.0.0", false)).toBe("UP_TO_DATE");
  });
});
