interface GitHubRepoInfo {
  owner: string;
  repo: string;
}

/** Extracts owner and repo from a GitHub repository URL. */
export function parseGitHubUrl(url: string): GitHubRepoInfo | null {
  const httpsMatch = url.match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/);
  if (httpsMatch) {
    return { owner: httpsMatch[1]!, repo: httpsMatch[2]! };
  }

  const sshMatch = url.match(/github\.com:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1]!, repo: sshMatch[2]! };
  }

  return null;
}
