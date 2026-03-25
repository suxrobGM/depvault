/** Recovery key generation, parsing, and import. */

import { asBuffer, CRYPTO_CONSTANTS, fromBase64, getRandomBytes, toBase64 } from "./encoding";

const { AES_KEY_LENGTH } = CRYPTO_CONSTANTS;

/** Generate a formatted recovery key (256-bit random, displayed as 8 groups of 4 base64 chars). */
export function generateRecoveryKey(): string {
  const bytes = getRandomBytes(32);
  const b64 = toBase64(asBuffer(bytes));
  const groups: string[] = [];
  for (let i = 0; i < b64.length && groups.length < 8; i += 4) {
    groups.push(b64.slice(i, i + 4));
  }
  return groups.join("-");
}

/** Parse a formatted recovery key back to raw bytes. */
export function recoveryKeyToBytes(formatted: string): Uint8Array {
  const b64 = formatted.replace(/-/g, "");
  return fromBase64(b64);
}

/** Import recovery key bytes as an AES-GCM CryptoKey for wrapping DEKs. */
export async function importRecoveryKey(recoveryKeyBytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    asBuffer(recoveryKeyBytes),
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}
