export const UserRole = {
  USER: "USER",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export type ProjectRole = "VIEWER" | "EDITOR" | "OWNER";
export type UserRoleValue = (typeof UserRole)[keyof typeof UserRole];

export const DEFAULT_ROLES: ReadonlySet<string> = new Set([UserRole.USER]);
export const PROJECT_ROLE_LEVEL: Record<ProjectRole, number> = { VIEWER: 0, EDITOR: 1, OWNER: 2 };
