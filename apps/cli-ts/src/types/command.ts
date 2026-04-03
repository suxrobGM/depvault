import type { ReactElement } from "react";

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
