export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  description: string | null;
  language: string | null;
  updated_at: string;
}

export interface GitHubTreeResponse {
  sha: string;
  tree: Array<{
    path: string;
    mode: string;
    type: string;
    size?: number;
  }>;
  truncated: boolean;
}

export interface GitHubContentResponse {
  content: string;
  encoding: string;
  name: string;
  path: string;
  size: number;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}
