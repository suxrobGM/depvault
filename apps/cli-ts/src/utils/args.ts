/** Extract the value of a named flag from args, e.g. `--project=abc` → `"abc"`. */
export function getFlag(args: string[], name: string): string | null {
  const prefix = `--${name}=`;
  const match = args.find((a) => a.startsWith(prefix));
  return match?.split("=").slice(1).join("=") ?? null;
}

/** Check whether a boolean flag is present, e.g. `--no-secrets`. */
export function hasFlag(args: string[], name: string): boolean {
  return args.includes(`--${name}`);
}

/** Get the first positional arg (one that doesn't start with `--`). */
export function getPositional(args: string[]): string | null {
  return args.find((a) => !a.startsWith("--")) ?? null;
}
