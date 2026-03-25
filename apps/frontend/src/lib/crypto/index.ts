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

export {
  CRYPTO_CONSTANTS,
  asBuffer,
  fromBase64,
  fromBase64Url,
  getRandomBytes,
  toBase64,
  toBase64Url,
} from "./encoding";
export {
  deriveKEK,
  exportDEK,
  generateDEK,
  generateSalt,
  importDEK,
  unwrapKey,
  wrapKey,
  type WrappedKey,
} from "./keys";
export { decrypt, decryptBinary, encrypt, encryptBinary, type EncryptedData } from "./aes-gcm";
export { deriveSharedKey, generateKeyPair, importPrivateKey, type ECDHKeyPair } from "./ecdh";
export { generateRecoveryKey, importRecoveryKey, recoveryKeyToBytes } from "./recovery";
export {
  generateShareKey,
  shareKeyFromFragment,
  shareKeyToFragment,
  type ShareKeyPair,
} from "./sharing";
export { deriveCIWrapKey } from "./ci";
