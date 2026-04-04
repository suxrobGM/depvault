import type { ReactElement } from "react";

export interface SelectOption {
  label: string;
  value: string;
}

/** Context passed to command handlers for vault-aware decisions. */
export interface CommandContext {
  isVaultUnlocked: boolean;
  kek: CryptoKey | null;
  requestPassword: () => Promise<string>;
  requestSelect: (options: SelectOption[]) => Promise<string>;
  requestText: (placeholder?: string) => Promise<string>;
}

/** Result from a command handler — carries rendered output and optional vault side-effects. */
export interface CommandResult {
  element: ReactElement;
  kek?: CryptoKey;
  lock?: boolean;
}

/** Wrap a plain ReactElement as a CommandResult with no side-effects. */
export function ok(element: ReactElement): CommandResult {
  return { element };
}
