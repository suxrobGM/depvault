import { decrypt } from "@/common/utils/encryption";
import type { EnvVariableWithValueResponse } from "./env-variable.schema";

interface EnvVariableRecord {
  id: string;
  environmentId: string;
  key: string;
  description: string | null;
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface EncryptedEnvVariableRecord extends EnvVariableRecord {
  encryptedValue: string;
  iv: string;
  authTag: string;
}

export function toResponseWithValue(
  variable: EnvVariableRecord,
  value: string,
): EnvVariableWithValueResponse {
  return {
    id: variable.id,
    environmentId: variable.environmentId,
    key: variable.key,
    value,
    description: variable.description,
    isRequired: variable.isRequired,
    createdAt: variable.createdAt,
    updatedAt: variable.updatedAt,
  };
}

export function toDecryptedResponse(
  variable: EncryptedEnvVariableRecord,
  projectKey: Buffer,
): EnvVariableWithValueResponse {
  const value = decrypt(variable.encryptedValue, variable.iv, variable.authTag, projectKey);
  return toResponseWithValue(variable, value);
}

export function toMaskedResponse(variable: EnvVariableRecord): EnvVariableWithValueResponse {
  return toResponseWithValue(variable, "********");
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
