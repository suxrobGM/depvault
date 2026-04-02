/**
 * Key Encryption Key (KEK) derivation, Data Encryption Key (DEK) lifecycle,
 * and AES-GCM key wrapping/unwrapping.
 */

import { asBuffer, CRYPTO_CONSTANTS, fromBase64, getRandomBytes, toBase64 } from "./encoding";

const { AES_KEY_LENGTH, IV_LENGTH, PBKDF2_ITERATIONS } = CRYPTO_CONSTANTS;

// ── KEK Derivation ──

/** Derive a Key Encryption Key from a vault password and salt using PBKDF2-SHA256. */
export async function deriveKEK(
  password: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: asBuffer(salt), iterations, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Generate a random salt for PBKDF2 (16 bytes). */
export function generateSalt(): Uint8Array {
  return getRandomBytes(16);
}

// ── DEK Lifecycle ──

/** Generate a random AES-256-GCM Data Encryption Key. */
export async function generateDEK(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: AES_KEY_LENGTH }, true, [
    "encrypt",
    "decrypt",
  ]);
}

/** Export a DEK to raw bytes. */
export async function exportDEK(dek: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey("raw", dek);
  return new Uint8Array(raw);
}

/** Import raw bytes as an AES-256-GCM DEK. */
export async function importDEK(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    asBuffer(raw),
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    true,
    ["encrypt", "decrypt"],
  );
}

// ── Key Wrapping (AES-GCM) ──

export interface WrappedKey {
  wrapped: string;
  iv: string;
  tag: string;
}

/** Wrap (encrypt) a raw key with a wrapping key using AES-GCM. */
export async function wrapKey(keyBytes: Uint8Array, wrappingKey: CryptoKey): Promise<WrappedKey> {
  const iv = getRandomBytes(IV_LENGTH);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asBuffer(iv) },
    wrappingKey,
    asBuffer(keyBytes),
  );

  const ct = new Uint8Array(ciphertext);
  const encryptedData = ct.slice(0, ct.length - 16);
  const authTag = ct.slice(ct.length - 16);

  return {
    wrapped: toBase64(asBuffer(encryptedData)),
    iv: toBase64(asBuffer(iv)),
    tag: toBase64(asBuffer(authTag)),
  };
}

/** Unwrap (decrypt) a wrapped key using AES-GCM. */
export async function unwrapKey(
  wrapped: string,
  iv: string,
  tag: string,
  wrappingKey: CryptoKey,
): Promise<Uint8Array> {
  const ciphertext = fromBase64(wrapped);
  const authTag = fromBase64(tag);
  const ivBytes = fromBase64(iv);

  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asBuffer(ivBytes) },
    wrappingKey,
    asBuffer(combined),
  );

  return new Uint8Array(decrypted);
}
