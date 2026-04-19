import { logger } from "@/common/logger";
import { parseUnifiedDiff } from "@/common/utils/diff";
import type { DetectionSeverity } from "@/generated/prisma";
import type { GitHubApiService } from "@/modules/github/github-api.service";

interface ScanPattern {
  id: string;
  name: string;
  regex: string;
  severity: DetectionSeverity;
  remediation?: string;
}

export interface RawDetection {
  patternId: string;
  patternName: string;
  severity: DetectionSeverity;
  commitHash: string;
  filePath: string;
  lineNumber: number | null;
  matchSnippet: string;
  remediationSteps: string | null;
}

interface ScanResult {
  detections: RawDetection[];
  commitsScanned: number;
}

const MAX_DIFF_SIZE = 1024 * 1024; // 1MB

const PLACEHOLDER_MARKERS = [
  "<placeholder>",
  "<your_",
  "your_",
  "your-",
  "xxxxxxxx",
  "changeme",
  "change-me",
  "change-in-production",
  "change_in_production",
  "replace_me",
  "replace-me",
  "example.com",
  "dummy",
  "ci-token",
];

/** Returns true if the line appears to contain a template placeholder rather than a real secret. */
function isPlaceholderLine(line: string): boolean {
  const lower = line.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker));
}

/** Redacts a matched secret, showing only first 4 and last 4 characters. */
function redactMatch(match: string): string {
  if (match.length <= 12) {
    return match.slice(0, 4) + "****";
  }
  return match.slice(0, 4) + "*".repeat(match.length - 8) + match.slice(-4);
}

/** Scans commit history for secrets using the GitHub API. */
export async function scanCommitHistory(
  githubApi: GitHubApiService,
  userId: string,
  owner: string,
  repo: string,
  patterns: ScanPattern[],
  maxCommits = 100,
): Promise<ScanResult> {
  const commits = await githubApi.listCommits(userId, owner, repo, maxCommits);
  const detections: RawDetection[] = [];
  const seen = new Set<string>();

  const compiledPatterns = patterns.map((p) => ({
    ...p,
    compiled: new RegExp(p.regex, "gi"),
  }));

  for (const commit of commits) {
    let diff: string;
    try {
      diff = await githubApi.getCommitDiff(userId, owner, repo, commit.sha);
    } catch (error) {
      logger.warn({ sha: commit.sha, error }, "Failed to fetch commit diff, skipping");
      continue;
    }

    if (diff.length > MAX_DIFF_SIZE) {
      logger.warn({ sha: commit.sha, size: diff.length }, "Skipping large diff");
      continue;
    }

    const addedLines = parseUnifiedDiff(diff);

    for (const line of addedLines) {
      if (isPlaceholderLine(line.content)) continue;

      for (const pattern of compiledPatterns) {
        pattern.compiled.lastIndex = 0;
        let regexMatch: RegExpExecArray | null;

        while ((regexMatch = pattern.compiled.exec(line.content)) !== null) {
          const dedupeKey = `${pattern.id}:${commit.sha}:${line.filePath}:${line.lineNumber}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);

          detections.push({
            patternId: pattern.id,
            patternName: pattern.name,
            severity: pattern.severity,
            commitHash: commit.sha,
            filePath: line.filePath,
            lineNumber: line.lineNumber,
            matchSnippet: redactMatch(regexMatch[0]),
            remediationSteps: pattern.remediation ?? null,
          });
        }
      }
    }
  }

  return { detections, commitsScanned: commits.length };
}
