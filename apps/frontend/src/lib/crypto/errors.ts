/**
 * Errors thrown by resolveProjectDEK. Callers distinguish these to decide whether to
 * guide the user toward re-granting vs. warning about a key mismatch — never to silently
 * overwrite the existing grant (which would destroy access to data encrypted under the
 * original DEK).
 */
export class KeyGrantMissingError extends Error {
  constructor(projectId: string) {
    super(`No key grant for project ${projectId}`);
    this.name = "KeyGrantMissingError";
  }
}

export class KeyGrantMismatchError extends Error {
  constructor(projectId: string, cause: unknown) {
    super(
      `Key grant for project ${projectId} could not be unwrapped — the stored grant was wrapped with a different key than your current vault KEK.`,
      { cause },
    );
    this.name = "KeyGrantMismatchError";
  }
}
