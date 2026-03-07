const SENSITIVE_KEYS = new Set([
  "password",
  "secret",
  "token",
  "authorization",
  "cookie",
  "encryptedvalue",
  "encryptedcontent",
  "encryptedpayload",
  "authtag",
  "iv",
  "masterkey",
  "masterencryptionkey",
  "projectkey",
  "plaintext",
  "decrypted",
  "ciphertext",
  "apikey",
  "privatekey",
  "refreshtoken",
  "accesstoken",
]);

const REDACTED = "[REDACTED]";

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase().replace(/[-_]/g, ""));
}

/** Returns `[REDACTED]` if the key matches a known sensitive pattern, otherwise returns the value as-is. */
export function sanitizeValue(key: string, value: unknown): unknown {
  if (isSensitiveKey(key)) return REDACTED;
  return value;
}

/**
 * Deep-clones an object, replacing values under sensitive keys with `[REDACTED]`.
 *
 * @param obj - The object to sanitize. Can be of any type; non-objects are returned as-is.
 * @returns A sanitized copy of the input object, with sensitive values redacted.
 * @remarks This function handles nested objects and arrays. It does not mutate the original object.
 */
export function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return obj;
  if (typeof obj !== "object") return obj;
  if (Buffer.isBuffer(obj)) return REDACTED;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = REDACTED;
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
