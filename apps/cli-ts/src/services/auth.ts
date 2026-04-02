import { CI_TOKEN_ENV_VAR } from "@/constants";
import { loadCredentials } from "./credentials";

export enum AuthMode {
  None = "none",
  Jwt = "jwt",
  CiToken = "ci-token",
}

export function getAuthMode(): AuthMode {
  if (process.env[CI_TOKEN_ENV_VAR]) {
    return AuthMode.CiToken;
  }
  if (loadCredentials()?.accessToken) {
    return AuthMode.Jwt;
  }
  return AuthMode.None;
}

export function getToken(): string | null {
  const ciToken = process.env[CI_TOKEN_ENV_VAR];
  if (ciToken) return ciToken;
  return loadCredentials()?.accessToken ?? null;
}

export function isInteractive(): boolean {
  return process.stdout.isTTY === true && !process.env[CI_TOKEN_ENV_VAR] && !process.env["CI"];
}
