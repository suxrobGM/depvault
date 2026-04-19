interface DiffLine {
  filePath: string;
  lineNumber: number;
  content: string;
}

const IGNORED_EXTENSIONS = new Set([
  ".lock",
  ".snap",
  ".map",
  ".min.js",
  ".min.css",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
]);

const IGNORED_PATTERNS: RegExp[] = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /__tests__\//,
  /__mocks__\//,
  /__snapshots__\//,
  /\/fixtures?\//,
  /\/test-data\//,
  /\/test-utils?\//,
  /\.stories\.[jt]sx?$/,
  /\.d\.ts$/,
  /(^|\/)node_modules\//,
  /(^|\/)dist\//,
  /(^|\/)build\//,
  /(^|\/)coverage\//,
  /(^|\/)vendor\//,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /bun\.lock$/,
  /pnpm-lock\.yaml$/,
  /composer\.lock$/,
  /Gemfile\.lock$/,
  /Cargo\.lock$/,
  /go\.sum$/,
  /\.example$/i,
  /\.sample$/i,
  /\.template$/i,
  /\.dist$/i,
  /\.tmpl$/i,
];

/** Returns true if the file should be skipped during secret scanning. */
export function shouldIgnoreFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();

  for (const ext of IGNORED_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }

  for (const pattern of IGNORED_PATTERNS) {
    if (pattern.test(filePath)) return true;
  }

  return false;
}

/** Parses a unified diff string and returns only added lines with file paths and line numbers. */
export function parseUnifiedDiff(diff: string): DiffLine[] {
  const lines = diff.split("\n");
  const results: DiffLine[] = [];

  let currentFile: string | null = null;
  let currentLine = 0;

  for (const line of lines) {
    if (line.startsWith("+++ b/")) {
      const filePath = line.slice(6);
      currentFile = shouldIgnoreFile(filePath) ? null : filePath;
      continue;
    }

    if (line.startsWith("--- ")) {
      continue;
    }

    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      currentLine = parseInt(hunkMatch[1]!, 10);
      continue;
    }

    if (!currentFile) continue;

    if (line.startsWith("+") && !line.startsWith("+++")) {
      results.push({
        filePath: currentFile,
        lineNumber: currentLine,
        content: line.slice(1),
      });
      currentLine++;
    } else if (line.startsWith("-")) {
      // Deleted line — don't increment line number
    } else {
      // Context line
      currentLine++;
    }
  }

  return results;
}
