import type { ReactElement } from "react";

/** Context passed to command handlers for vault-aware decisions. */
export interface CommandContext {
  isVaultUnlocked: boolean;
  requestPassword: () => Promise<string>;
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
