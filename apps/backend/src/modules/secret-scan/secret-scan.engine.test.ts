import { describe, expect, it, mock } from "bun:test";
import type { GitHubApiService } from "@/modules/github/github-api.service";
import { scanCommitHistory, type RawDetection } from "./secret-scan.engine";

function makeDiff(filePath: string, addedLines: string[]): string {
  const additions = addedLines.map((l) => `+${l}`).join("\n");
  return [
    `diff --git a/${filePath} b/${filePath}`,
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    `@@ -1,0 +1,${addedLines.length} @@`,
    additions,
  ].join("\n");
}

function createMockGitHubApi(
  commits: { sha: string }[],
  diffs: Record<string, string>,
): GitHubApiService {
  return {
    listCommits: mock(() => Promise.resolve(commits)),
    getCommitDiff: mock((_uid: string, _owner: string, _repo: string, sha: string) => {
      const diff = diffs[sha];
      if (diff === undefined) return Promise.reject(new Error(`No diff for ${sha}`));
      return Promise.resolve(diff);
    }),
  } as unknown as GitHubApiService;
}

const awsPattern = {
  id: "p-aws",
  name: "AWS Access Key ID",
  regex: "AKIA[0-9A-Z]{16}",
  severity: "CRITICAL" as const,
  remediation: "Rotate the AWS key immediately.",
};

const genericSecretPattern = {
  id: "p-secret",
  name: "Generic Secret",
  regex: "(secret|password)\\s*[:=]\\s*['\"][^\\s'\"]{8,}['\"]",
  severity: "MEDIUM" as const,
};

describe("scanCommitHistory", () => {
  it("should detect secrets in commit diffs", async () => {
    const commits = [{ sha: "abc123" }];
    const diffs = {
      abc123: makeDiff("config.ts", ['const key = "AKIAIOSFODNN7EXAMPLE";']),
    };
    const api = createMockGitHubApi(commits, diffs);

    const result = await scanCommitHistory(api, "user1", "owner", "repo", [awsPattern]);

    expect(result.commitsScanned).toBe(1);
    expect(result.detections).toHaveLength(1);
    expect(result.detections[0]!.patternId).toBe("p-aws");
    expect(result.detections[0]!.commitHash).toBe("abc123");
    expect(result.detections[0]!.filePath).toBe("config.ts");
    expect(result.detections[0]!.lineNumber).toBe(1);
    expect(result.detections[0]!.severity).toBe("CRITICAL");
    expect(result.detections[0]!.remediationSteps).toBe("Rotate the AWS key immediately.");
  });

  it("should redact matched secrets (long match)", async () => {
    const commits = [{ sha: "abc123" }];
    const diffs = {
      abc123: makeDiff("env.ts", ['const key = "AKIAIOSFODNN7EXAMPLE";']),
    };
    const api = createMockGitHubApi(commits, diffs);

    const result = await scanCommitHistory(api, "user1", "owner", "repo", [awsPattern]);

    const snippet = result.detections[0]!.matchSnippet;
    expect(snippet.startsWith("AKIA")).toBe(true);
    expect(snippet.endsWith("MPLE")).toBe(true);
    expect(snippet).toContain("*");
    expect(snippet).not.toBe("AKIAIOSFODNN7EXAMPLE");
  });

  it("should redact short matches (<=12 chars)", async () => {
    const shortPattern = {
      id: "p-short",
      name: "Short Key",
      regex: "SK_[A-Z]{5}",
      severity: "HIGH" as const,
    };
    const commits = [{ sha: "c1" }];
    const diffs = {
      c1: makeDiff("app.ts", ['key = "SK_ABCDE"']),
    };
    const api = createMockGitHubApi(commits, diffs);

    const result = await scanCommitHistory(api, "user1", "owner", "repo", [shortPattern]);

    expect(result.detections).toHaveLength(1);
    const snippet = result.detections[0]!.matchSnippet;
    expect(snippet).toBe("SK_A****");
  });

  it("should scan multiple commits", async () => {
    const commits = [{ sha: "c1" }, { sha: "c2" }];
    const diffs = {
      c1: makeDiff("file1.ts", ['const k = "AKIAIOSFODNN7EXAMPLE";']),
      c2: makeDiff("file2.ts", ['const k2 = "AKIA0000000000000000";']),
    };
    const api = createMockGitHubApi(commits, diffs);

    const result = await scanCommitHistory(api, "user1", "owner", "repo", [awsPattern]);

    expect(result.commitsScanned).toBe(2);
    expect(result.detections).toHaveLength(2);
    expect(result.detections[0]!.filePath).toBe("file1.ts");
    expect(result.detections[1]!.filePath).toBe("file2.ts");
  });

  it("should run multiple patterns against the same diff", async () => {
    const commits = [{ sha: "c1" }];
    const diffs = {
      c1: makeDiff("config.ts", [
        'aws_key = "AKIAIOSFODNN7EXAMPLE"',
        'secret = "supersecretpassword123"',
      ]),
    };
    const api = createMockGitHubApi(commits, diffs);

    const result = await scanCommitHistory(api, "user1", "owner", "repo", [
      awsPattern,
      genericSecretPattern,
    ]);

    expect(result.detections).toHaveLength(2);
    const patternIds = result.detections.map((d) => d.patternId);
    expect(patternIds).toContain("p-aws");
    expect(patternIds).toContain("p-secret");
  });

  it("should deduplicate detections for the same pattern, commit, file, and line", async () => {
    const commits = [{ sha: "c1" }];
    const diffs = {
      c1: makeDiff("config.ts", ["AKIAIOSFODNN7EXAMPLE AKIAIOSFODNN7EXAMPLF"]),
    };
    const api = createMockGitHubApi(commits, diffs);

    // Two AWS keys on the same line — same pattern/commit/file/line → deduplicated
    const result = await scanCommitHistory(api, "user1", "owner", "repo", [awsPattern]);

    expect(result.detections).toHaveLength(1);
  });

  it("should not deduplicate detections on different lines", async () => {
    const commits = [{ sha: "c1" }];
    const diffs = {
      c1: makeDiff("config.ts", ["AKIAIOSFODNN7EXAMPLE", "AKIA0000000000000000"]),
    };
    const api = createMockGitHubApi(commits, diffs);

    const result = await scanCommitHistory(api, "user1", "owner", "repo", [awsPattern]);

    expect(result.detections).toHaveLength(2);
  });

  it("should skip diffs larger than 1MB", async () => {
    const largeLine = "x".repeat(1024 * 1024 + 1);
    const commits = [{ sha: "c1" }];
    const diffs = {
      c1: makeDiff("big.ts", [largeLine]),
    };
    const api = createMockGitHubApi(commits, diffs);

    const result = await scanCommitHistory(api, "user1", "owner", "repo", [awsPattern]);

    expect(result.commitsScanned).toBe(1);
    expect(result.detections).toHaveLength(0);
  });

  it("should continue scanning when a commit diff fetch fails", async () => {
    const commits = [{ sha: "fail" }, { sha: "ok" }];
    const diffs = {
      ok: makeDiff("file.ts", ['key = "AKIAIOSFODNN7EXAMPLE"']),
      // "fail" has no entry, so getCommitDiff will reject
    };
    const api = createMockGitHubApi(commits, diffs);

    const result = await scanCommitHistory(api, "user1", "owner", "repo", [awsPattern]);

    expect(result.commitsScanned).toBe(2);
    expect(result.detections).toHaveLength(1);
    expect(result.detections[0]!.commitHash).toBe("ok");
  });

  it("should return zero detections when no secrets are found", async () => {
    const commits = [{ sha: "c1" }];
    const diffs = {
      c1: makeDiff("clean.ts", ['const greeting = "hello world";']),
    };
    const api = createMockGitHubApi(commits, diffs);

    const result = await scanCommitHistory(api, "user1", "owner", "repo", [awsPattern]);

    expect(result.commitsScanned).toBe(1);
    expect(result.detections).toHaveLength(0);
  });

  it("should handle empty commit list", async () => {
    const api = createMockGitHubApi([], {});

    const result = await scanCommitHistory(api, "user1", "owner", "repo", [awsPattern]);

    expect(result.commitsScanned).toBe(0);
    expect(result.detections).toHaveLength(0);
  });

  it("should set remediationSteps to null when pattern has no remediation", async () => {
    const noRemediationPattern = {
      id: "p-nr",
      name: "No Remediation",
      regex: "LEAK_[A-Z]{10}",
      severity: "HIGH" as const,
    };
    const commits = [{ sha: "c1" }];
    const diffs = {
      c1: makeDiff("file.ts", ["LEAK_ABCDEFGHIJ"]),
    };
    const api = createMockGitHubApi(commits, diffs);

    const result = await scanCommitHistory(api, "user1", "owner", "repo", [noRemediationPattern]);

    expect(result.detections).toHaveLength(1);
    expect(result.detections[0]!.remediationSteps).toBeNull();
  });

  it("should only scan added lines, not deleted or context lines", async () => {
    const commits = [{ sha: "c1" }];
    const diffs = {
      c1: [
        "diff --git a/file.ts b/file.ts",
        "--- a/file.ts",
        "+++ b/file.ts",
        "@@ -1,3 +1,3 @@",
        " safe context line",
        '-old_key = "AKIAIOSFODNN7EXAMPLE"',
        "+clean_replacement = 42",
      ].join("\n"),
    };
    const api = createMockGitHubApi(commits, diffs);

    const result = await scanCommitHistory(api, "user1", "owner", "repo", [awsPattern]);

    expect(result.detections).toHaveLength(0);
  });

  it("should pass maxCommits to listCommits", async () => {
    const api = createMockGitHubApi([], {});

    await scanCommitHistory(api, "user1", "owner", "repo", [awsPattern], 50);

    expect(api.listCommits).toHaveBeenCalledWith("user1", "owner", "repo", 50);
  });

  it("should skip test files and only detect secrets in production files", async () => {
    const commits = [{ sha: "c1" }];
    const diffs = {
      c1: [
        "diff --git a/src/auth.service.test.ts b/src/auth.service.test.ts",
        "--- /dev/null",
        "+++ b/src/auth.service.test.ts",
        "@@ -0,0 +1,1 @@",
        '+const key = "AKIAIOSFODNN7EXAMPLE";',
        "diff --git a/src/config.ts b/src/config.ts",
        "--- /dev/null",
        "+++ b/src/config.ts",
        "@@ -0,0 +1,1 @@",
        '+const key = "AKIA0000000000000000";',
      ].join("\n"),
    };
    const api = createMockGitHubApi(commits, diffs);

    const result = await scanCommitHistory(api, "user1", "owner", "repo", [awsPattern]);

    expect(result.detections).toHaveLength(1);
    expect(result.detections[0]!.filePath).toBe("src/config.ts");
  });

  it("should skip lock files and node_modules", async () => {
    const commits = [{ sha: "c1" }];
    const diffs = {
      c1: [
        "diff --git a/package-lock.json b/package-lock.json",
        "--- /dev/null",
        "+++ b/package-lock.json",
        "@@ -0,0 +1,1 @@",
        '+secret: "AKIAIOSFODNN7EXAMPLE"',
        "diff --git a/node_modules/pkg/index.js b/node_modules/pkg/index.js",
        "--- /dev/null",
        "+++ b/node_modules/pkg/index.js",
        "@@ -0,0 +1,1 @@",
        '+key = "AKIA0000000000000000"',
      ].join("\n"),
    };
    const api = createMockGitHubApi(commits, diffs);

    const result = await scanCommitHistory(api, "user1", "owner", "repo", [awsPattern]);

    expect(result.detections).toHaveLength(0);
  });
});
