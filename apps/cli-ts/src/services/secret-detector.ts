import { readFileSync } from "node:fs";

interface SecretDetection {
  filePath: string;
  line: number;
  patternName: string;
  severity: string;
  snippet: string;
}

interface Pattern {
  name: string;
  severity: string;
  regex: RegExp;
  configOnly?: boolean;
}

const PATTERNS: Pattern[] = [
  { name: "AWS Access Key", severity: "Critical", regex: /AKIA[0-9A-Z]{16}/ },
  {
    name: "Private Key",
    severity: "Critical",
    regex: /-----BEGIN (RSA|EC|DSA|OPENSSH|PGP) PRIVATE KEY-----/,
  },
  { name: "GitHub Token", severity: "Critical", regex: /gh[ps]_[A-Za-z0-9_]{36,}/ },
  { name: "Slack Token", severity: "High", regex: /xox[bpors]-[A-Za-z0-9\-]+/ },
  {
    name: "JWT Token",
    severity: "Medium",
    regex: /eyJ[A-Za-z0-9\-_]{10,}\.eyJ[A-Za-z0-9\-_]{10,}\.[A-Za-z0-9\-_]{10,}/,
  },
  {
    name: "AWS Secret Key",
    severity: "Critical",
    regex: /aws_secret_access_key\s*[=:]\s*[A-Za-z0-9/+=]{20,}/,
    configOnly: true,
  },
  {
    name: "Generic API Key",
    severity: "High",
    regex: /(?:api[_\-]?key|apikey)\s*[=:]\s*['"]?[A-Za-z0-9\-_]{16,}/,
    configOnly: true,
  },
  {
    name: "Generic Secret",
    severity: "High",
    regex: /(?:secret|password|passwd|pwd)\s*=\s*['"]?[^\s'"${<][^\s'"]{7,}/,
    configOnly: true,
  },
  {
    name: "Connection String",
    severity: "High",
    regex: /(?:Server|Data Source)=.*(?:Password|Pwd)=[^\s;]{4,}/i,
    configOnly: true,
  },
  {
    name: "Database URI",
    severity: "Medium",
    regex: /(?:mongodb|postgresql|mysql|redis|amqp):\/\/[^@\s:]+:[^@\s]+@(?!localhost)[^\s]+/,
    configOnly: true,
  },
];

const CONFIG_EXTENSIONS = new Set([
  ".env",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".cfg",
  ".conf",
  ".properties",
  ".xml",
]);

const PLACEHOLDER_PATTERNS = [
  /\$\{/,
  /<[A-Z_]+>/,
  /your[_-]/,
  /example/,
  /dummy/,
  /changeme/i,
  /TODO/i,
  /FIXME/i,
];

function isPlaceholder(line: string): boolean {
  return PLACEHOLDER_PATTERNS.some((p) => p.test(line));
}

function isConfigFile(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return CONFIG_EXTENSIONS.has(ext);
}

export function scanFile(filePath: string): SecretDetection[] {
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return [];
  }

  const isConfig = isConfigFile(filePath);
  const detections: SecretDetection[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trimStart().startsWith("#") || line.trimStart().startsWith("//")) continue;
    if (isPlaceholder(line)) continue;

    for (const pattern of PATTERNS) {
      if (pattern.configOnly && !isConfig) continue;
      if (pattern.regex.test(line)) {
        detections.push({
          filePath,
          line: i + 1,
          patternName: pattern.name,
          severity: pattern.severity,
          snippet: line.trim().slice(0, 80),
        });
      }
    }
  }

  return detections;
}

export function scanDirectory(rootDir: string): SecretDetection[] {
  const allFiles: string[] = [];

  // Reuse the walk logic from file-scanner
  const { readdirSync, statSync } = require("node:fs");
  const { join } = require("node:path");

  const EXCLUDED = new Set([
    ".git",
    "node_modules",
    ".venv",
    "venv",
    "dist",
    "build",
    "out",
    "target",
    "bin",
    "obj",
    ".next",
    ".cache",
    "coverage",
    "vendor",
  ]);

  function walk(dir: string, depth: number): void {
    if (depth > 10) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (EXCLUDED.has(entry)) continue;
      const full = join(dir, entry);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) walk(full, depth + 1);
      else if (stat.isFile() && stat.size < 1_000_000) allFiles.push(full);
    }
  }

  walk(rootDir, 0);
  return allFiles.flatMap((f) => scanFile(f));
}
