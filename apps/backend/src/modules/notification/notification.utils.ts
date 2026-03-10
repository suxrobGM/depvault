export type NotifyPayload =
  | { type: "VULNERABILITY_FOUND"; userId: string; projectId: string; count: number }
  | { type: "SECRET_ROTATION"; userId: string; projectId: string; variableNames: string[] }
  | {
      type: "ENV_DRIFT";
      userId: string;
      projectId: string;
      missingVars: { env: string; variable: string }[];
    }
  | { type: "GIT_SECRET_DETECTION"; userId: string; projectId: string; fileName: string }
  | { type: "TEAM_INVITE"; userId: string; projectId: string }
  | { type: "ROLE_CHANGE"; userId: string; projectId: string; oldRole: string; newRole: string };

interface NotificationContent {
  title: string;
  message: string;
  metadata: Record<string, unknown>;
}

/** Builds title, message, and metadata for a notification based on its type. */
export function createNotificationContent(
  payload: NotifyPayload,
  projectName: string,
): NotificationContent {
  const base = { projectId: payload.projectId, projectName };

  switch (payload.type) {
    case "VULNERABILITY_FOUND": {
      const s = payload.count === 1 ? "y" : "ies";
      return {
        title: "Vulnerability Alert",
        message: `${payload.count} vulnerabilit${s} found in ${projectName}`,
        metadata: { ...base, count: payload.count },
      };
    }
    case "SECRET_ROTATION":
      return {
        title: "Secret Rotation Reminder",
        message: `${payload.variableNames.length} variable${payload.variableNames.length === 1 ? "" : "s"} in ${projectName} are due for rotation`,
        metadata: { ...base, variableNames: payload.variableNames },
      };
    case "ENV_DRIFT":
      return {
        title: "Environment Drift Detected",
        message: `${payload.missingVars.length} variable${payload.missingVars.length === 1 ? "" : "s"} missing across environments in ${projectName}`,
        metadata: { ...base, missingVars: payload.missingVars },
      };
    case "GIT_SECRET_DETECTION":
      return {
        title: "Secret Detected in Repository",
        message: `A secret was found in ${payload.fileName} in ${projectName}`,
        metadata: { ...base, fileName: payload.fileName },
      };
    case "TEAM_INVITE":
      return {
        title: "Project Invitation",
        message: `You have been added to ${projectName}`,
        metadata: base,
      };
    case "ROLE_CHANGE":
      return {
        title: "Role Updated",
        message: `Your role in ${projectName} changed from ${payload.oldRole} to ${payload.newRole}`,
        metadata: { ...base, oldRole: payload.oldRole, newRole: payload.newRole },
      };
  }
}
