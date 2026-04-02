import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { CONFIG_DIR, CREDENTIALS_FILE } from "@/constants";

export interface StoredCredentials {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
}

let cached: StoredCredentials | null = null;

export function loadCredentials(): StoredCredentials | null {
  if (cached) return cached;

  if (!existsSync(CREDENTIALS_FILE)) return null;

  try {
    const raw = readFileSync(CREDENTIALS_FILE, "utf-8");
    cached = JSON.parse(raw) as StoredCredentials;
    return cached;
  } catch {
    return null;
  }
}

export function saveCredentials(creds: StoredCredentials): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2) + "\n");
  cached = creds;
}

export function clearCredentials(): void {
  if (existsSync(CREDENTIALS_FILE)) {
    unlinkSync(CREDENTIALS_FILE);
  }
  cached = null;
}

export function clearCredentialsCache(): void {
  cached = null;
}
