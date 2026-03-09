export const UserRole = {
  USER: "USER",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export type UserRoleValue = (typeof UserRole)[keyof typeof UserRole];

export const DEFAULT_ROLES: ReadonlySet<string> = new Set([UserRole.USER]);
