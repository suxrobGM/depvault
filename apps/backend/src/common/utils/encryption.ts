import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

export interface EncryptedData {
  /** The encrypted data, encoded in base64. */
  ciphertext: string;
  /** The initialization vector used during encryption, encoded in base64. */
  iv: string;
  /** The authentication tag from encryption, encoded in base64. */
  authTag: string;
}

export interface EncryptedBinaryData {
  /** The encrypted data as a Buffer. This is not base64-encoded to avoid unnecessary overhead for binary data. */
  ciphertext: Buffer;
  /** The initialization vector used during encryption, encoded in base64. */
  iv: string;
  /** The authentication tag from encryption, encoded in base64. */
  authTag: string;
}

/**
 * Retrieves the master encryption key from the environment variable and returns it as a Buffer.
 * @throws If the MASTER_ENCRYPTION_KEY environment variable is not set.
 * @returns The master key as a Buffer.
 * @remarks The master key should be a 64-character hexadecimal string (32 bytes) defined in the .env file.
 */
function getMasterKey(): Buffer {
  const key = process.env.MASTER_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("MASTER_ENCRYPTION_KEY environment variable is not set");
  }
  return Buffer.from(key, "hex");
}

/**
 * Derives a per-project 256-bit key from the master key using HKDF-SHA256.
 *
 * @param projectId - The project ID for which to derive the key.
 * @returns The derived project key as a Buffer.
 */
export function deriveProjectKey(projectId: string): Buffer {
  const masterKey = getMasterKey();
  return Buffer.from(hkdfSync("sha256", masterKey, projectId, "depvault-project-key", KEY_LENGTH));
}

/**
 * Encrypts a UTF-8 string with AES-256-GCM. Returns base64-encoded ciphertext, IV, and auth tag.
 *
 * @param plaintext - The string to encrypt.
 *  @param projectKey - The 32-byte project key to use for encryption.
 * @returns An object containing the base64-encoded ciphertext, IV, and auth tag.
 * @throws If encryption fails (e.g. invalid key length).
 */
export function encrypt(plaintext: string, projectKey: Buffer): EncryptedData {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, projectKey, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

/**
 * Decrypts a base64-encoded AES-256-GCM ciphertext back to a UTF-8 string.
 * @param ciphertext - The base64-encoded ciphertext to decrypt.
 * @param iv - The base64-encoded initialization vector used during encryption.
 * @param authTag - The base64-encoded authentication tag from encryption.
 * @param projectKey - The 32-byte project key to use for decryption.
 * @returns The decrypted plaintext string.
 * @throws If decryption fails (e.g. authentication error, invalid key).
 */
export function decrypt(
  ciphertext: string,
  iv: string,
  authTag: string,
  projectKey: Buffer,
): string {
  const decipher = createDecipheriv(ALGORITHM, projectKey, Buffer.from(iv, "base64"), {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf-8");
}

/**
 * Encrypts binary data (e.g. secret files) with AES-256-GCM. Returns ciphertext as Buffer.
 *
 * @param data - The binary data to encrypt as a Buffer.
 * @param projectKey - The 32-byte project key to use for encryption.
 * @return An object containing the ciphertext as a Buffer, and the IV and auth tag as base64 strings.
 */
export function encryptBinary(data: Buffer, projectKey: Buffer): EncryptedBinaryData {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, projectKey, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

  return {
    ciphertext: encrypted,
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

/**
 * Decrypts AES-256-GCM encrypted binary data back to a Buffer.
 *
 * @param ciphertext - The encrypted data as a Buffer.
 * @param iv - The base64-encoded initialization vector used during encryption.
 * @param authTag - The base64-encoded authentication tag from encryption.
 * @param projectKey - The 32-byte project key to use for decryption.
 * @returns The decrypted data as a Buffer.
 * @throws If decryption fails (e.g. authentication error, invalid key).
 */
export function decryptBinary(
  ciphertext: Buffer,
  iv: string,
  authTag: string,
  projectKey: Buffer,
): Buffer {
  const decipher = createDecipheriv(ALGORITHM, projectKey, Buffer.from(iv, "base64"), {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
