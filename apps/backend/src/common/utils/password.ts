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
