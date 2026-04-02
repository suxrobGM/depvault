import { homedir } from "node:os";
import { join } from "node:path";

export const VERSION = "2.0.0";

export const CONFIG_DIR = join(homedir(), ".depvault");
export const CONFIG_FILE = join(CONFIG_DIR, "config.json");
export const CREDENTIALS_FILE = join(CONFIG_DIR, "credentials.json");
export const VERSION_CHECK_FILE = join(CONFIG_DIR, "version-check.json");

export const DEFAULT_SERVER = "https://depvault.com";

export const CI_TOKEN_ENV_VAR = "DEPVAULT_TOKEN";
export const VAULT_PASSWORD_ENV_VAR = "DEPVAULT_VAULT_PASSWORD";

export const GITHUB_REPO = "suxrobGM/depvault";

export const AUTO_LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
