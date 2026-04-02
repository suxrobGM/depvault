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

export const COMMANDS: Record<string, { description: string; aliases?: string[] }> = {
  login: { description: "Authenticate via browser" },
  logout: { description: "Clear credentials" },
  whoami: { description: "Show current user" },
  version: { description: "Show CLI version" },
  unlock: { description: "Unlock vault (derive KEK from password)" },
  lock: { description: "Lock vault (clear KEK/DEK cache)" },
  project: { description: "Interactive project selector" },
  "project create": { description: "Create a new project" },
  "project list": { description: "List your projects" },
  "project info": { description: "Show project details" },
  pull: { description: "Pull env vars + secret files" },
  push: { description: "Push env vars + secret files" },
  "env list": { description: "List environment variables" },
  "env diff": { description: "Compare environments" },
  "secrets list": { description: "List secret files" },
  analyze: { description: "Analyze dependency file" },
  scan: { description: "Interactive repository scan" },
  "config set": { description: "Set a config value" },
  "config get": { description: "Get a config value" },
  update: { description: "Update CLI to latest version" },
  help: { description: "Show available commands" },
  exit: { description: "Exit the CLI", aliases: ["quit", "q"] },
};

/** Resolve a parsed command to a canonical command name (handles subcommands). */
export function resolveCommand(parsed: ParsedCommand): { command: string; args: string[] } {
  // Try two-word commands first: "project list", "env diff", etc.
  if (parsed.args.length > 0) {
    const twoWord = `${parsed.name} ${parsed.args[0]}`;
    if (twoWord in COMMANDS) {
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
