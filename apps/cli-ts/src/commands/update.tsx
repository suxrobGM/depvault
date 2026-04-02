import { execSync } from "node:child_process";
import { chmodSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ReactElement } from "react";
import { Box, Text } from "ink";
import { GITHUB_REPO, VERSION } from "@/constants";
import { ErrorBox } from "@/ui/error-box";
import { KeyValue } from "@/ui/key-value";
import { Success } from "@/ui/success";
import { colors } from "@/ui/theme";

interface GitHubRelease {
  tag_name: string;
  assets: Array<{ name: string; browser_download_url: string }>;
}

function detectPlatform(): string | null {
  const arch = process.arch;
  const platform = process.platform;

  if (platform === "win32") return "windows-x64";
  if (platform === "linux" && arch === "x64") return "linux-x64";
  if (platform === "darwin" && arch === "arm64") return "darwin-arm64";
  if (platform === "darwin" && arch === "x64") return "darwin-x64";
  return null;
}

function parseVersion(tag: string): string | null {
  const match = tag.match(/^cli-ts-v(.+)$/);
  return match?.[1] ?? null;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export default async function handler(_args: string[]): Promise<ReactElement> {
  const platform = detectPlatform();
  if (!platform) {
    return <ErrorBox message={`Unsupported platform: ${process.platform}-${process.arch}`} />;
  }

  // Fetch latest release from GitHub
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=20`, {
    headers: {
      "User-Agent": "depvault-cli",
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    return <ErrorBox message="Failed to check for updates." />;
  }

  const releases = (await res.json()) as GitHubRelease[];
  let latestVersion: string | null = null;
  let latestRelease: GitHubRelease | null = null;

  for (const release of releases) {
    const version = parseVersion(release.tag_name);
    if (!version) continue;
    if (!latestVersion || compareVersions(version, latestVersion) > 0) {
      latestVersion = version;
      latestRelease = release;
    }
  }

  if (!latestVersion || !latestRelease) {
    return <Text color={colors.muted}>No releases found.</Text>;
  }

  if (compareVersions(latestVersion, VERSION) <= 0) {
    return <Success message={`Already on the latest version (v${VERSION}).`} />;
  }

  // Find the correct asset
  const ext = process.platform === "win32" ? "zip" : "tar.gz";
  const assetName = `depvault-${platform}.${ext}`;
  const asset = latestRelease.assets.find((a) => a.name === assetName);

  if (!asset) {
    return (
      <ErrorBox message={`No binary found for ${platform} in release ${latestRelease.tag_name}.`} />
    );
  }

  // Download
  const downloadRes = await fetch(asset.browser_download_url, {
    headers: { "User-Agent": "depvault-cli" },
  });

  if (!downloadRes.ok) {
    return <ErrorBox message="Failed to download update." />;
  }

  const buffer = Buffer.from(await downloadRes.arrayBuffer());
  const tempDir = join(tmpdir(), `depvault-update-${Date.now()}`);
  const tempFile = join(tempDir, assetName);

  const { mkdirSync } = await import("node:fs");
  mkdirSync(tempDir, { recursive: true });
  writeFileSync(tempFile, buffer);

  // Extract and replace
  if (ext === "zip") {
    execSync(`tar -xf "${tempFile}" -C "${tempDir}"`, { stdio: "ignore" });
  } else {
    execSync(`tar -xzf "${tempFile}" -C "${tempDir}"`, { stdio: "ignore" });
  }

  const binaryName = process.platform === "win32" ? "depvault.exe" : "depvault";
  const newBinary = join(tempDir, binaryName);
  const currentBinary = process.execPath;

  try {
    if (process.platform === "win32") {
      const backupPath = currentBinary + ".old";
      try {
        unlinkSync(backupPath);
      } catch {
        /* ignore */
      }
      renameSync(currentBinary, backupPath);
      renameSync(newBinary, currentBinary);
    } else {
      chmodSync(newBinary, 0o755);
      renameSync(newBinary, currentBinary);
    }
  } catch (err) {
    return (
      <ErrorBox
        message={`Failed to replace binary: ${err instanceof Error ? err.message : String(err)}`}
      />
    );
  }

  return (
    <Box flexDirection="column">
      <Success message={`Updated to v${latestVersion}`} />
      <KeyValue label="From" value={`v${VERSION}`} />
      <KeyValue label="To" value={`v${latestVersion}`} />
    </Box>
  );
}
