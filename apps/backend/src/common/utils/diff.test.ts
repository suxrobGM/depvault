import { describe, expect, it } from "bun:test";
import { parseUnifiedDiff, shouldIgnoreFile } from "./diff";

describe("parseUnifiedDiff", () => {
  it("should parse added lines with correct file paths and line numbers", () => {
    const diff = `diff --git a/src/config.ts b/src/config.ts
--- a/src/config.ts
+++ b/src/config.ts
@@ -1,3 +1,5 @@
 const x = 1;
+const API_KEY = "AKIA1234567890ABCDEF";
+const SECRET = "mysecret";
 const y = 2;
`;

    const result = parseUnifiedDiff(diff);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      filePath: "src/config.ts",
      lineNumber: 2,
      content: 'const API_KEY = "AKIA1234567890ABCDEF";',
    });
    expect(result[1]).toEqual({
      filePath: "src/config.ts",
      lineNumber: 3,
      content: 'const SECRET = "mysecret";',
    });
  });

  it("should handle multiple files in a single diff", () => {
    const diff = `diff --git a/file1.ts b/file1.ts
--- a/file1.ts
+++ b/file1.ts
@@ -1,2 +1,3 @@
 line1
+added in file1
 line2
diff --git a/file2.ts b/file2.ts
--- /dev/null
+++ b/file2.ts
@@ -0,0 +1,2 @@
+new file line1
+new file line2
`;

    const result = parseUnifiedDiff(diff);

    expect(result).toHaveLength(3);
    expect(result[0]!.filePath).toBe("file1.ts");
    expect(result[0]!.lineNumber).toBe(2);
    expect(result[1]!.filePath).toBe("file2.ts");
    expect(result[1]!.lineNumber).toBe(1);
    expect(result[2]!.filePath).toBe("file2.ts");
    expect(result[2]!.lineNumber).toBe(2);
  });

  it("should skip deleted lines", () => {
    const diff = `diff --git a/file.ts b/file.ts
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,2 @@
 line1
-removed line
 line3
`;

    const result = parseUnifiedDiff(diff);
    expect(result).toHaveLength(0);
  });

  it("should handle empty diff", () => {
    const result = parseUnifiedDiff("");
    expect(result).toHaveLength(0);
  });

  it("should track line numbers correctly with mixed additions and deletions", () => {
    const diff = `diff --git a/app.ts b/app.ts
--- a/app.ts
+++ b/app.ts
@@ -5,4 +5,5 @@
 context line at 5
-deleted at 6
+added at 6
+added at 7
 context at 8
`;

    const result = parseUnifiedDiff(diff);

    expect(result).toHaveLength(2);
    expect(result[0]!.lineNumber).toBe(6);
    expect(result[1]!.lineNumber).toBe(7);
  });

  it("should skip test files in diff", () => {
    const diff = `diff --git a/src/service.test.ts b/src/service.test.ts
--- /dev/null
+++ b/src/service.test.ts
@@ -0,0 +1,2 @@
+const key = "AKIAIOSFODNN7EXAMPLE";
+const secret = "supersecret";
diff --git a/src/config.ts b/src/config.ts
--- /dev/null
+++ b/src/config.ts
@@ -0,0 +1,1 @@
+const key = "AKIAIOSFODNN7EXAMPLE";
`;

    const result = parseUnifiedDiff(diff);

    expect(result).toHaveLength(1);
    expect(result[0]!.filePath).toBe("src/config.ts");
  });

  it("should skip lock files and binary assets in diff", () => {
    const diff = `diff --git a/package-lock.json b/package-lock.json
--- /dev/null
+++ b/package-lock.json
@@ -0,0 +1,1 @@
+secret = "leaked"
diff --git a/assets/logo.png b/assets/logo.png
--- /dev/null
+++ b/assets/logo.png
@@ -0,0 +1,1 @@
+binary content
diff --git a/src/app.ts b/src/app.ts
--- /dev/null
+++ b/src/app.ts
@@ -0,0 +1,1 @@
+real code here
`;

    const result = parseUnifiedDiff(diff);

    expect(result).toHaveLength(1);
    expect(result[0]!.filePath).toBe("src/app.ts");
  });
});

describe("shouldIgnoreFile", () => {
  it("should ignore test files", () => {
    expect(shouldIgnoreFile("src/service.test.ts")).toBe(true);
    expect(shouldIgnoreFile("src/service.test.tsx")).toBe(true);
    expect(shouldIgnoreFile("src/service.test.js")).toBe(true);
    expect(shouldIgnoreFile("src/service.test.jsx")).toBe(true);
    expect(shouldIgnoreFile("src/service.spec.ts")).toBe(true);
    expect(shouldIgnoreFile("src/service.spec.js")).toBe(true);
  });

  it("should ignore __tests__ and __mocks__ directories", () => {
    expect(shouldIgnoreFile("src/__tests__/helper.ts")).toBe(true);
    expect(shouldIgnoreFile("src/__mocks__/api.ts")).toBe(true);
    expect(shouldIgnoreFile("src/__snapshots__/comp.snap")).toBe(true);
  });

  it("should ignore fixture and test-data directories", () => {
    expect(shouldIgnoreFile("tests/fixtures/data.json")).toBe(true);
    expect(shouldIgnoreFile("tests/fixture/data.json")).toBe(true);
    expect(shouldIgnoreFile("src/test-data/sample.ts")).toBe(true);
    expect(shouldIgnoreFile("src/test-utils/helper.ts")).toBe(true);
    expect(shouldIgnoreFile("src/test-util/helper.ts")).toBe(true);
  });

  it("should ignore lock files", () => {
    expect(shouldIgnoreFile("package-lock.json")).toBe(true);
    expect(shouldIgnoreFile("yarn.lock")).toBe(true);
    expect(shouldIgnoreFile("bun.lock")).toBe(true);
    expect(shouldIgnoreFile("pnpm-lock.yaml")).toBe(true);
    expect(shouldIgnoreFile("Gemfile.lock")).toBe(true);
    expect(shouldIgnoreFile("Cargo.lock")).toBe(true);
    expect(shouldIgnoreFile("go.sum")).toBe(true);
    expect(shouldIgnoreFile("composer.lock")).toBe(true);
  });

  it("should ignore binary and asset files", () => {
    expect(shouldIgnoreFile("assets/logo.png")).toBe(true);
    expect(shouldIgnoreFile("images/photo.jpg")).toBe(true);
    expect(shouldIgnoreFile("images/photo.jpeg")).toBe(true);
    expect(shouldIgnoreFile("icons/icon.svg")).toBe(true);
    expect(shouldIgnoreFile("fonts/font.woff2")).toBe(true);
    expect(shouldIgnoreFile("fonts/font.woff")).toBe(true);
    expect(shouldIgnoreFile("fonts/font.ttf")).toBe(true);
  });

  it("should ignore build artifacts and generated files", () => {
    expect(shouldIgnoreFile("dist/bundle.js")).toBe(true);
    expect(shouldIgnoreFile("build/output.js")).toBe(true);
    expect(shouldIgnoreFile("coverage/lcov.info")).toBe(true);
    expect(shouldIgnoreFile("vendor/lib.js")).toBe(true);
    expect(shouldIgnoreFile("node_modules/pkg/index.js")).toBe(true);
    expect(shouldIgnoreFile("src/types.d.ts")).toBe(true);
  });

  it("should ignore minified files and sourcemaps", () => {
    expect(shouldIgnoreFile("lib/bundle.min.js")).toBe(true);
    expect(shouldIgnoreFile("styles/app.min.css")).toBe(true);
    expect(shouldIgnoreFile("lib/bundle.js.map")).toBe(true);
  });

  it("should ignore storybook files", () => {
    expect(shouldIgnoreFile("src/Button.stories.tsx")).toBe(true);
    expect(shouldIgnoreFile("src/Card.stories.ts")).toBe(true);
  });

  it("should NOT ignore production source files", () => {
    expect(shouldIgnoreFile("src/config.ts")).toBe(false);
    expect(shouldIgnoreFile("src/app.tsx")).toBe(false);
    expect(shouldIgnoreFile("src/modules/auth/auth.service.ts")).toBe(false);
    expect(shouldIgnoreFile(".env")).toBe(false);
    expect(shouldIgnoreFile("docker-compose.yml")).toBe(false);
    expect(shouldIgnoreFile("src/lib/api.js")).toBe(false);
    expect(shouldIgnoreFile("prisma/schema/user.prisma")).toBe(false);
  });

  it("should handle extension matching case-insensitively", () => {
    expect(shouldIgnoreFile("assets/image.PNG")).toBe(true);
    expect(shouldIgnoreFile("assets/image.JPG")).toBe(true);
  });
});
