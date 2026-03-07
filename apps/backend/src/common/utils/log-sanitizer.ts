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
  "connectionstring",
  "databaseurl",
]);

const REDACTED = "[REDACTED]";

const SENSITIVE_VALUE_PATTERNS: RegExp[] = [
  // API keys (e.g. sk_live_xxx, AKIA..., ghp_xxx, glpat-xxx)
  /(?:sk_(?:live|test)_[\w-]{20,}|AKIA[\w]{16}|ghp_[\w]{36,}|glpat-[\w-]{20,})/,
  // JWT tokens (three base64url segments separated by dots)
  /eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/,
  // Private key headers
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  // Connection strings with credentials
  /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s]+:[^\s]+@/,
  // Long base64-encoded secrets (48+ chars, likely a key or token)
  /^[A-Za-z0-9+/]{48,}={0,2}$/,
];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase().replace(/[-_]/g, ""));
}

function containsSensitivePattern(value: string): boolean {
  return SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function sanitizeString(value: string): string {
  if (containsSensitivePattern(value)) return REDACTED;
  return value;
}

/** Returns `[REDACTED]` if the key matches a known sensitive pattern, otherwise returns the value as-is. */
export function sanitizeValue(key: string, value: unknown): unknown {
  if (isSensitiveKey(key)) return REDACTED;
  if (typeof value === "string" && containsSensitivePattern(value)) return REDACTED;
  return value;
}

/**
 * Deep-clones an object, replacing values under sensitive keys with `[REDACTED]`.
 * Also detects string values matching known secret patterns (JWTs, API keys, connection strings, private keys).
 */
export function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return sanitizeString(obj);
  if (typeof obj !== "object") return obj;
  if (Buffer.isBuffer(obj)) return REDACTED;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = REDACTED;
    } else if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
