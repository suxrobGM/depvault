/** Ephemeral key operations for one-time share links. */

import { asBuffer, CRYPTO_CONSTANTS, fromBase64Url, toBase64Url } from "./encoding";

const { AES_KEY_LENGTH } = CRYPTO_CONSTANTS;

export interface ShareKeyPair {
  raw: Uint8Array;
  key: CryptoKey;
}

/** Generate a random AES-256 key for one-time share links. */
export async function generateShareKey(): Promise<ShareKeyPair> {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: AES_KEY_LENGTH }, true, [
    "encrypt",
    "decrypt",
  ]);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  return { raw, key };
}

/** Recover a share key from the URL fragment (base64url-encoded raw bytes). */
export async function shareKeyFromFragment(fragment: string): Promise<CryptoKey> {
  const raw = fromBase64Url(fragment);
  return crypto.subtle.importKey(
    "raw",
    asBuffer(raw),
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encode share key raw bytes for inclusion in a URL fragment. */
export function shareKeyToFragment(raw: Uint8Array): string {
  return toBase64Url(asBuffer(raw));
}
