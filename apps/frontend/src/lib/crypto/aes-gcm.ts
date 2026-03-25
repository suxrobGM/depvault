/** High-level AES-256-GCM encrypt/decrypt for strings and binary data. */

import { asBuffer, CRYPTO_CONSTANTS, fromBase64, getRandomBytes, toBase64 } from "./encoding";

const { IV_LENGTH } = CRYPTO_CONSTANTS;

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
}

/** Encrypt a UTF-8 string with AES-256-GCM. Returns base64-encoded fields. */
export async function encrypt(plaintext: string, dek: CryptoKey): Promise<EncryptedData> {
  const iv = getRandomBytes(IV_LENGTH);
  const encoded = new TextEncoder().encode(plaintext);
  const result = await crypto.subtle.encrypt({ name: "AES-GCM", iv: asBuffer(iv) }, dek, encoded);

  const ct = new Uint8Array(result);
  const encryptedData = ct.slice(0, ct.length - 16);
  const authTag = ct.slice(ct.length - 16);

  return {
    ciphertext: toBase64(asBuffer(encryptedData)),
    iv: toBase64(asBuffer(iv)),
    authTag: toBase64(asBuffer(authTag)),
  };
}

/** Decrypt a base64-encoded AES-256-GCM ciphertext back to a UTF-8 string. */
export async function decrypt(
  ciphertext: string,
  iv: string,
  authTag: string,
  dek: CryptoKey,
): Promise<string> {
  const ct = fromBase64(ciphertext);
  const tag = fromBase64(authTag);
  const ivBytes = fromBase64(iv);

  const combined = new Uint8Array(ct.length + tag.length);
  combined.set(ct);
  combined.set(tag, ct.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asBuffer(ivBytes) },
    dek,
    asBuffer(combined),
  );

  return new TextDecoder().decode(decrypted);
}

/** Encrypt binary data with AES-256-GCM. Returns base64-encoded fields. */
export async function encryptBinary(data: ArrayBuffer, dek: CryptoKey): Promise<EncryptedData> {
  const iv = getRandomBytes(IV_LENGTH);
  const result = await crypto.subtle.encrypt({ name: "AES-GCM", iv: asBuffer(iv) }, dek, data);

  const ct = new Uint8Array(result);
  const encryptedData = ct.slice(0, ct.length - 16);
  const authTag = ct.slice(ct.length - 16);

  return {
    ciphertext: toBase64(asBuffer(encryptedData)),
    iv: toBase64(asBuffer(iv)),
    authTag: toBase64(asBuffer(authTag)),
  };
}

/** Decrypt base64-encoded AES-256-GCM ciphertext back to an ArrayBuffer. */
export async function decryptBinary(
  ciphertext: string,
  iv: string,
  authTag: string,
  dek: CryptoKey,
): Promise<ArrayBuffer> {
  const ct = fromBase64(ciphertext);
  const tag = fromBase64(authTag);
  const ivBytes = fromBase64(iv);

  const combined = new Uint8Array(ct.length + tag.length);
  combined.set(ct);
  combined.set(tag, ct.length);

  return crypto.subtle.decrypt({ name: "AES-GCM", iv: asBuffer(ivBytes) }, dek, asBuffer(combined));
}
