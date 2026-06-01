/**
 * Validates a post-auth redirect target (e.g. `?redirect=/cli/verify?code=ABCD-EFGH`).
 *
 * Returns the value only if it is a safe, same-origin relative path; otherwise `null`. This guards
 * against open-redirect attacks where a crafted `redirect` param points at an external site.
 */
export function safeRedirect(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  // Must be a root-relative path ("/path"). Reject absolute URLs ("https://evil"),
  // protocol-relative ("//evil"), and backslash variants ("/\\evil") that some browsers
  // normalize to protocol-relative.
  if (!value.startsWith("/")) {
    return null;
  }
  if (value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }
  return value;
}
