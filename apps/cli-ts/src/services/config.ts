import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { CONFIG_DIR, CONFIG_FILE, DEFAULT_SERVER } from "@/constants";

export interface AppConfig {
  server: string;
  activeProjectId?: string;
  activeProjectName?: string;
  outputFormat: string;
}

const DEFAULT_CONFIG: AppConfig = {
  server: DEFAULT_SERVER,
  outputFormat: "table",
};

let cached: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cached) return cached;

  if (!existsSync(CONFIG_FILE)) {
    cached = { ...DEFAULT_CONFIG };
    return cached;
  }

  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    cached = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    return cached!;
  } catch {
    cached = { ...DEFAULT_CONFIG };
    return cached;
  }
}

export function saveConfig(config: AppConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");
  cached = config;
}

export function updateConfig(updates: Partial<AppConfig>): void {
  const config = loadConfig();
  Object.assign(config, updates);
  saveConfig(config);
}

export function clearConfigCache(): void {
  cached = null;
}
