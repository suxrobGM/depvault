import { createHash, randomBytes } from "node:crypto";
import * as Bun from "bun";

/**
 * Password hashing utilities using Bun's built-in password hashing.
 * @param password The plaintext password to hash
 * @returns The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: "bcrypt", cost: 12 });
}

/**
 * Verifies a password against a hash using Bun's built-in password verification.
 * @param password The plaintext password to verify
 * @param hash The hashed password to compare against
 * @returns True if the password matches the hash, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

/**
 * Generates a secure random token of the specified byte length (default 32 bytes = 64 hex characters).
 * @param length The number of random bytes to generate (default 32)
 * @returns A hexadecimal string representation of the random token
 */
export function createRandomToken(length: number = 32): string {
  return randomBytes(length).toString("hex");
}

/**
 * Hashes a token using SHA-256.
 * This is used to store a hash of CI tokens for verification without storing the raw token.
 * @param token The raw token to hash
 * @returns The hexadecimal string representation of the token hash
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
