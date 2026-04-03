export interface ParsedCommand {
  name: string;
  args: string[];
  raw: string;
}

/** Parse a slash command input string into name and arguments. */
export function parseCommand(input: string): ParsedCommand | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;

  const parts = trimmed.slice(1).split(/\s+/);
  const name = parts[0]!;
  const args = parts.slice(1);

  return { name, args, raw: trimmed };
}

/** REPL commands — single-word interactive commands shown in the suggestion dropdown. */
export const COMMANDS: Record<string, { description: string; aliases?: string[] }> = {
  login: { description: "Authenticate via browser" },
  logout: { description: "Clear credentials" },
  whoami: { description: "Show current user" },
  version: { description: "Show CLI version" },
  unlock: { description: "Unlock vault" },
  lock: { description: "Lock vault" },
  project: { description: "Manage projects" },
  pull: { description: "Pull env vars + secret files" },
  push: { description: "Push env vars + secret files" },
  env: { description: "List environment variables" },
  secrets: { description: "List secret files" },
  config: { description: "Manage config" },
  analyze: { description: "Analyze dependency file" },
  scan: { description: "Scan repository" },
  update: { description: "Update CLI" },
  help: { description: "Show available commands" },
  exit: { description: "Exit the CLI", aliases: ["quit", "q"] },
};

/**
 * Non-interactive subcommands — resolved when args are present.
 * e.g. `/project create my-app` → command="project create", args=["my-app"]
 */
const SUBCOMMANDS = new Set([
  "project create",
  "project list",
  "project select",
  "project info",
  "config set",
  "config get",
]);

/** Resolve a parsed command to a canonical command name (handles subcommands). */
export function resolveCommand(parsed: ParsedCommand): { command: string; args: string[] } {
  // Try two-word subcommands first: "project list", "config set", etc.
  if (parsed.args.length > 0) {
    const twoWord = `${parsed.name} ${parsed.args[0]}`;
    if (SUBCOMMANDS.has(twoWord)) {
      return { command: twoWord, args: parsed.args.slice(1) };
    }
  }

  // Check aliases
  for (const [name, meta] of Object.entries(COMMANDS)) {
    if (meta.aliases?.includes(parsed.name)) {
      return { command: name, args: parsed.args };
    }
  }

  return { command: parsed.name, args: parsed.args };
}
