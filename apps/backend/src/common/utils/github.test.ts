import { describe, expect, it } from "bun:test";
import { parseGitHubUrl } from "./github";

describe("parseGitHubUrl", () => {
  it("should parse HTTPS URL", () => {
    expect(parseGitHubUrl("https://github.com/owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it("should parse HTTPS URL with .git suffix", () => {
    expect(parseGitHubUrl("https://github.com/owner/repo.git")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it("should parse SSH URL", () => {
    expect(parseGitHubUrl("git@github.com:owner/repo.git")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it("should parse SSH URL without .git suffix", () => {
    expect(parseGitHubUrl("git@github.com:owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it("should handle owner/repo with dots and hyphens", () => {
    expect(parseGitHubUrl("https://github.com/my-org/my.repo-name")).toEqual({
      owner: "my-org",
      repo: "my.repo-name",
    });
  });

  it("should return null for non-GitHub URLs", () => {
    expect(parseGitHubUrl("https://gitlab.com/owner/repo")).toBeNull();
  });

  it("should return null for invalid URLs", () => {
    expect(parseGitHubUrl("not a url")).toBeNull();
  });
});
