import type { EnvVariableWithValueResponse } from "./env-variable.schema";

interface EnvVariableRecord {
  id: string;
  environmentId: string;
  key: string;
  encryptedValue: string;
  iv: string;
  authTag: string;
  sortOrder: number | null;
  encryptedComment: string | null;
  commentIv: string | null;
  commentAuthTag: string | null;
  description: string | null;
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Map a Prisma env variable to an API response (encrypted fields pass through). */
export function toEncryptedResponse(variable: EnvVariableRecord): EnvVariableWithValueResponse {
  return {
    id: variable.id,
    environmentId: variable.environmentId,
    key: variable.key,
    encryptedValue: variable.encryptedValue,
    iv: variable.iv,
    authTag: variable.authTag,
    sortOrder: variable.sortOrder,
    encryptedComment: variable.encryptedComment,
    commentIv: variable.commentIv,
    commentAuthTag: variable.commentAuthTag,
    description: variable.description,
    isRequired: variable.isRequired,
    createdAt: variable.createdAt,
    updatedAt: variable.updatedAt,
  };
}

export function toExampleLine(variable: {
  key: string;
  description: string | null;
  isRequired: boolean;
}): string {
  const comment = variable.description ? ` # ${variable.description}` : "";
  const required = variable.isRequired ? " (required)" : "";
  return `${variable.key}=${required}${comment}`;
}
