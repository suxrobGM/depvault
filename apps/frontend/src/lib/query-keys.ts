/**
 * Centralized, hierarchical React Query key factory.
 *
 * Each factory returns an `as const` tuple. The first element (root token) is kept
 * stable per domain so React Query's prefix-based invalidation behaves predictably:
 * invalidating a parent key (e.g. `queryKeys.analyses.byProject(id)`) also matches
 * its more specific descendants (e.g. the paginated `list`).
 */
export const queryKeys = {
  projects: {
    all: ["projects"] as const,
    list: () => ["projects"] as const,
    detail: (projectId: string) => ["projects", projectId] as const,
    members: (projectId: string) => ["projects", projectId, "members"] as const,
    invitations: (projectId: string) => ["projects", projectId, "invitations"] as const,
    pendingKeyGrants: (projectId: string) =>
      ["projects", projectId, "keygrants", "pending"] as const,
    stats: () => ["project-stats"] as const,
  },

  invitations: {
    pending: () => ["invitations", "pending"] as const,
  },

  analyses: {
    byProject: (projectId: string) => ["analyses", projectId] as const,
    overview: (projectId: string) => ["analyses", projectId, "overview"] as const,
    list: (projectId: string, page: number, pageSize: number) =>
      ["analyses", projectId, page, pageSize] as const,
    preview: (projectId: string) => ["analyses", projectId, 1] as const,
    detail: (projectId: string, analysisId: string) => ["analyses", projectId, analysisId] as const,
  },

  auditLog: {
    list: (
      projectId: string,
      page: number,
      pageSize: number,
      action: string,
      resourceType: string,
      from: string,
      to: string,
      userEmail: string,
    ) =>
      ["audit-log", projectId, page, pageSize, action, resourceType, from, to, userEmail] as const,
  },

  globalActivity: {
    list: (
      page: number,
      pageSize: number,
      action: string,
      resourceType: string,
      from: string,
      to: string,
    ) => ["global-activity", page, pageSize, action, resourceType, from, to] as const,
  },

  licenses: {
    rules: (projectId: string) => ["license-rules", projectId] as const,
    complianceOverview: (projectId: string) =>
      ["license-compliance", projectId, "overview"] as const,
    compliance: (projectId: string, page: number, pageSize: number, search: string) =>
      ["license-compliance", projectId, page, pageSize, search] as const,
  },

  repo: {
    map: (projectId: string) => ["repo-map", projectId] as const,
    apps: (projectId: string) => ["apps", projectId] as const,
    configFile: (projectId: string, fileId: string) => ["config-file", projectId, fileId] as const,
    configFileContent: (projectId: string, fileId: string) =>
      ["config-file-content", projectId, fileId] as const,
    configFileVersions: (projectId: string, fileId: string) =>
      ["config-file-versions", projectId, fileId] as const,
  },

  secretFiles: {
    byProject: (projectId: string) => ["secret-files", projectId] as const,
    overview: (projectId: string) => ["secret-files", projectId, "overview"] as const,
    versions: (projectId: string, fileId: string) =>
      ["secret-file-versions", projectId, fileId] as const,
  },

  ciTokens: {
    byProject: (projectId: string) => ["ci-tokens", projectId] as const,
  },

  scanning: {
    summary: (projectId: string) => ["scan-summary", projectId] as const,
    summaryOverview: (projectId: string) => ["scan-summary", projectId, "overview"] as const,
    scans: (projectId: string) => ["scans", projectId] as const,
    scansList: (projectId: string, page: number, pageSize: number) =>
      ["scans", projectId, page, pageSize] as const,
    detections: (projectId: string) => ["detections", projectId] as const,
    detectionsList: (
      projectId: string,
      page: number,
      pageSize: number,
      statusFilter: string,
      severityFilter: string,
    ) => ["detections", projectId, page, pageSize, statusFilter, severityFilter] as const,
    patterns: (projectId: string) => ["scan-patterns", projectId] as const,
  },

  sharedSecrets: {
    byProject: (projectId: string) => ["shared-secrets", projectId] as const,
  },

  github: {
    repos: () => ["github-repos"] as const,
    dependencyFiles: (owner: string | undefined, repo: string | undefined) =>
      ["github-dep-files", owner, repo] as const,
  },

  security: {
    overview: () => ["security-overview"] as const,
  },

  subscription: {
    all: ["subscription"] as const,
    current: () => ["subscription"] as const,
  },

  notifications: {
    all: ["notifications"] as const,
    list: (filters: unknown) => ["notifications", "list", filters] as const,
    unreadCount: () => ["notifications", "unread-count"] as const,
  },

  admin: {
    stats: () => ["admin-stats"] as const,
    users: () => ["admin-users"] as const,
    usersList: (page: number, pageSize: number, search: string, planFilter: string) =>
      ["admin-users", page, pageSize, search, planFilter] as const,
    userDetail: (userId: string | null) => ["admin-user-detail", userId] as const,
    subscriptions: () => ["admin-subscriptions"] as const,
    subscriptionsList: (page: number, pageSize: number, planFilter: string, statusFilter: string) =>
      ["admin-subscriptions", page, pageSize, planFilter, statusFilter] as const,
  },
};
