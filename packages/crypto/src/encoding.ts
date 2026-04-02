const PBKDF2_ITERATIONS = 600_000;
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12;
const HKDF_CI_INFO = "depvault-ci-wrap";

export const CRYPTO_CONSTANTS = {
  PBKDF2_ITERATIONS,
  AES_KEY_LENGTH,
  IV_LENGTH,
  HKDF_CI_INFO,
};

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
