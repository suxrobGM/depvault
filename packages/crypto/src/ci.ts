/** CI token key derivation using HKDF-SHA256. */

import { CRYPTO_CONSTANTS } from "./encoding";

const { AES_KEY_LENGTH, HKDF_CI_INFO } = CRYPTO_CONSTANTS;

/** Derive a wrapping key from a raw CI token using HKDF-SHA256. */
export async function deriveCIWrapKey(rawToken: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(rawToken),
    "HKDF",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: new TextEncoder().encode(HKDF_CI_INFO),
    },
    keyMaterial,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}
