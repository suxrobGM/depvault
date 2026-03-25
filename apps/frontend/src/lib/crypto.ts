/**
 * End-to-end encryption module using the WebCrypto API.
 *
 * Key hierarchy:
 *   Vault Password → (PBKDF2) → KEK → wraps/unwraps DEKs and ECDH private key
 *   DEK (per project) → AES-256-GCM encrypt/decrypt of secrets
 *   Recovery Key → independently wraps each project DEK
 *   ECDH P-256 keypair → team key distribution
 *   Share Key (ephemeral) → one-time share links
 *   CI Wrap Key (HKDF from token) → wraps DEK for CI pipelines
 */

const PBKDF2_ITERATIONS = 600_000;
const AES_KEY_LENGTH = 256; // 32 bytes for AES-256, but WebCrypto expects length in bits
const IV_LENGTH = 12;
const HKDF_CI_INFO = "depvault-ci-wrap";

export const CRYPTO_CONSTANTS = {
  PBKDF2_ITERATIONS,
  AES_KEY_LENGTH,
  IV_LENGTH,
  HKDF_CI_INFO,
};

// ── Helpers ──

export function toBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer as ArrayBuffer)));
}

/** Convert a Uint8Array to an ArrayBuffer (needed for strict TS buffer types). */
export function asBuffer(arr: Uint8Array): ArrayBuffer {
  return arr.buffer as ArrayBuffer;
}

/** Convert a base64 string to a Uint8Array. */
export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Base64url encoding: URL-safe characters and no padding. */
export function toBase64Url(buffer: ArrayBuffer): string {
  return toBase64(buffer).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Convert a base64url string to a Uint8Array. */
export function fromBase64Url(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  return fromBase64(pad ? b64 + "=".repeat(4 - pad) : b64);
}

/** Generate a specified number of random bytes using the WebCrypto API. */
export function getRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

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

  // AES-GCM appends the 16-byte auth tag to the ciphertext
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

  // Reassemble ciphertext + authTag as WebCrypto expects
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

// ── Data Encryption (String) ──

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

// ── Data Encryption (Binary) ──

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

// ── ECDH Key Pair (P-256) ──

export interface ECDHKeyPair {
  publicKey: string;
  privateKeyRaw: Uint8Array;
}

/** Generate an ECDH P-256 keypair. Returns base64 public key and raw private key bytes. */
export async function generateKeyPair(): Promise<ECDHKeyPair> {
  const keyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveKey",
  ]);

  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyRaw = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    publicKey: toBase64(publicKeyRaw),
    privateKeyRaw: new Uint8Array(privateKeyRaw),
  };
}

/** Import a base64 ECDH public key. */
async function importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    asBuffer(fromBase64(publicKeyBase64)),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
}

/** Import a PKCS8 ECDH private key from raw bytes. */
export async function importPrivateKey(privateKeyRaw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8",
    asBuffer(privateKeyRaw),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey"],
  );
}

/** Derive a shared AES-256-GCM key from an ECDH private key and a recipient's public key. */
export async function deriveSharedKey(
  privateKey: CryptoKey,
  publicKeyBase64: string,
): Promise<CryptoKey> {
  const publicKey = await importPublicKey(publicKeyBase64);

  return crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

// ── Recovery Key ──

/** Generate a formatted recovery key (256-bit random, displayed as 8 groups of 4 base64 chars). */
export function generateRecoveryKey(): string {
  const bytes = getRandomBytes(32);
  const b64 = toBase64(asBuffer(bytes));
  // Format as groups of 4: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
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

// ── Share Link Ephemeral Key ──

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

// ── CI Token Key Derivation ──

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
