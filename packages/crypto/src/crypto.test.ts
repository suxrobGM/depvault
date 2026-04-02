import { describe, expect, it } from "bun:test";
import {
  CRYPTO_CONSTANTS,
  decrypt,
  decryptBinary,
  deriveCIWrapKey,
  deriveKEK,
  deriveSharedKey,
  encrypt,
  encryptBinary,
  exportDEK,
  fromBase64,
  fromBase64Url,
  generateDEK,
  generateKeyPair,
  generateRecoveryKey,
  generateSalt,
  generateShareKey,
  importDEK,
  importPrivateKey,
  importRecoveryKey,
  recoveryKeyToBytes,
  shareKeyFromFragment,
  shareKeyToFragment,
  toBase64,
  toBase64Url,
  unwrapKey,
  wrapKey,
} from "./index";

// Use reduced iterations for fast tests
const FAST_ITERATIONS = 1000;

describe("Helpers", () => {
  describe("toBase64 / fromBase64", () => {
    it("round-trips arbitrary bytes", () => {
      const original = crypto.getRandomValues(new Uint8Array(64));
      const b64 = toBase64(original.buffer as ArrayBuffer);
      const recovered = fromBase64(b64);
      expect(recovered).toEqual(original);
    });

    it("round-trips empty buffer", () => {
      const empty = new Uint8Array(0);
      const b64 = toBase64(empty.buffer as ArrayBuffer);
      const recovered = fromBase64(b64);
      expect(recovered).toEqual(empty);
    });
  });

  describe("toBase64Url / fromBase64Url", () => {
    it("round-trips arbitrary bytes", () => {
      const original = crypto.getRandomValues(new Uint8Array(64));
      const b64url = toBase64Url(original.buffer as ArrayBuffer);
      const recovered = fromBase64Url(b64url);
      expect(recovered).toEqual(original);
    });

    it("produces URL-safe characters (no +, /, =)", () => {
      const data = crypto.getRandomValues(new Uint8Array(128));
      const b64url = toBase64Url(data.buffer as ArrayBuffer);
      expect(b64url).not.toMatch(/[+/=]/);
    });
  });

  describe("generateSalt", () => {
    it("returns 16 bytes", () => {
      const salt = generateSalt();
      expect(salt).toBeInstanceOf(Uint8Array);
      expect(salt.length).toBe(16);
    });
  });

  describe("CRYPTO_CONSTANTS", () => {
    it("exposes expected values", () => {
      expect(CRYPTO_CONSTANTS.PBKDF2_ITERATIONS).toBe(600_000);
      expect(CRYPTO_CONSTANTS.AES_KEY_LENGTH).toBe(256);
      expect(CRYPTO_CONSTANTS.IV_LENGTH).toBe(12);
    });
  });
});

describe("KEK Derivation", () => {
  it("produces a CryptoKey", async () => {
    const salt = generateSalt();
    const kek = await deriveKEK("password", salt, FAST_ITERATIONS);
    expect(kek).toBeInstanceOf(CryptoKey);
    expect(kek.algorithm).toMatchObject({ name: "AES-GCM", length: 256 });
  });

  it("same password + salt is deterministic", async () => {
    const salt = generateSalt();
    const kek1 = await deriveKEK("test-pass", salt, FAST_ITERATIONS);
    const kek2 = await deriveKEK("test-pass", salt, FAST_ITERATIONS);

    const dek = await generateDEK();
    const dekRaw = await exportDEK(dek);

    const wrapped = await wrapKey(dekRaw, kek1);
    const unwrapped = await unwrapKey(wrapped.wrapped, wrapped.iv, wrapped.tag, kek2);
    expect(unwrapped).toEqual(dekRaw);
  });

  it("different password produces different key", async () => {
    const salt = generateSalt();
    const kek1 = await deriveKEK("password-a", salt, FAST_ITERATIONS);
    const kek2 = await deriveKEK("password-b", salt, FAST_ITERATIONS);

    const dek = await generateDEK();
    const dekRaw = await exportDEK(dek);

    const wrapped = await wrapKey(dekRaw, kek1);
    await expect(unwrapKey(wrapped.wrapped, wrapped.iv, wrapped.tag, kek2)).rejects.toThrow();
  });

  it("different salt produces different key", async () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const kek1 = await deriveKEK("same-pass", salt1, FAST_ITERATIONS);
    const kek2 = await deriveKEK("same-pass", salt2, FAST_ITERATIONS);

    const dek = await generateDEK();
    const dekRaw = await exportDEK(dek);

    const wrapped = await wrapKey(dekRaw, kek1);
    await expect(unwrapKey(wrapped.wrapped, wrapped.iv, wrapped.tag, kek2)).rejects.toThrow();
  });
});

describe("DEK Lifecycle", () => {
  it("generateDEK returns a CryptoKey", async () => {
    const dek = await generateDEK();
    expect(dek).toBeInstanceOf(CryptoKey);
    expect(dek.algorithm).toMatchObject({ name: "AES-GCM", length: 256 });
    expect(dek.extractable).toBe(true);
    expect(dek.usages).toContain("encrypt");
    expect(dek.usages).toContain("decrypt");
  });

  it("exportDEK → importDEK round-trip preserves functionality", async () => {
    const originalDek = await generateDEK();
    const raw = await exportDEK(originalDek);
    expect(raw).toBeInstanceOf(Uint8Array);
    expect(raw.length).toBe(32);

    const importedDek = await importDEK(raw);

    const { ciphertext, iv, authTag } = await encrypt("round-trip test", originalDek);
    const decrypted = await decrypt(ciphertext, iv, authTag, importedDek);
    expect(decrypted).toBe("round-trip test");
  });

  it("two generated DEKs have distinct raw bytes", async () => {
    const dek1 = await generateDEK();
    const dek2 = await generateDEK();
    const raw1 = await exportDEK(dek1);
    const raw2 = await exportDEK(dek2);
    expect(raw1).not.toEqual(raw2);
  });
});

describe("Encrypt / Decrypt (string)", () => {
  it("round-trips plaintext", async () => {
    const dek = await generateDEK();
    const { ciphertext, iv, authTag } = await encrypt("hello world", dek);
    const result = await decrypt(ciphertext, iv, authTag, dek);
    expect(result).toBe("hello world");
  });

  it("round-trips unicode text (emoji, CJK)", async () => {
    const dek = await generateDEK();
    const text = "Hello 🌍🔐 你好世界 こんにちは";
    const { ciphertext, iv, authTag } = await encrypt(text, dek);
    const result = await decrypt(ciphertext, iv, authTag, dek);
    expect(result).toBe(text);
  });

  it("round-trips empty string", async () => {
    const dek = await generateDEK();
    const { ciphertext, iv, authTag } = await encrypt("", dek);
    const result = await decrypt(ciphertext, iv, authTag, dek);
    expect(result).toBe("");
  });

  it("round-trips large string (10KB+)", async () => {
    const dek = await generateDEK();
    const largeText = "A".repeat(12_000);
    const { ciphertext, iv, authTag } = await encrypt(largeText, dek);
    const result = await decrypt(ciphertext, iv, authTag, dek);
    expect(result).toBe(largeText);
  });

  it("same plaintext + same DEK produces different ciphertext (random IV)", async () => {
    const dek = await generateDEK();
    const enc1 = await encrypt("same text", dek);
    const enc2 = await encrypt("same text", dek);

    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
    expect(enc1.iv).not.toBe(enc2.iv);
  });

  it("decrypt with wrong DEK throws", async () => {
    const dek1 = await generateDEK();
    const dek2 = await generateDEK();
    const { ciphertext, iv, authTag } = await encrypt("secret", dek1);

    await expect(decrypt(ciphertext, iv, authTag, dek2)).rejects.toThrow();
  });

  it("tampered ciphertext throws", async () => {
    const dek = await generateDEK();
    const { ciphertext, iv, authTag } = await encrypt("secret", dek);

    const ctBytes = fromBase64(ciphertext);
    ctBytes[0] = ctBytes[0]! ^ 0xff;
    const tampered = toBase64(ctBytes.buffer as ArrayBuffer);

    await expect(decrypt(tampered, iv, authTag, dek)).rejects.toThrow();
  });

  it("tampered authTag throws", async () => {
    const dek = await generateDEK();
    const { ciphertext, iv, authTag } = await encrypt("secret", dek);

    const tagBytes = fromBase64(authTag);
    tagBytes[0] = tagBytes[0]! ^ 0xff;
    const tampered = toBase64(tagBytes.buffer as ArrayBuffer);

    await expect(decrypt(ciphertext, iv, tampered, dek)).rejects.toThrow();
  });
});

describe("Encrypt / Decrypt (binary)", () => {
  it("round-trips binary data", async () => {
    const dek = await generateDEK();
    const original = crypto.getRandomValues(new Uint8Array(256));
    const { ciphertext, iv, authTag } = await encryptBinary(original.buffer as ArrayBuffer, dek);
    const result = await decryptBinary(ciphertext, iv, authTag, dek);
    expect(new Uint8Array(result)).toEqual(original);
  });

  it("round-trips empty buffer", async () => {
    const dek = await generateDEK();
    const empty = new ArrayBuffer(0);
    const { ciphertext, iv, authTag } = await encryptBinary(empty, dek);
    const result = await decryptBinary(ciphertext, iv, authTag, dek);
    expect(new Uint8Array(result)).toEqual(new Uint8Array(0));
  });

  it("round-trips binary data with all byte values", async () => {
    const dek = await generateDEK();
    const allBytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) allBytes[i] = i;
    const { ciphertext, iv, authTag } = await encryptBinary(allBytes.buffer as ArrayBuffer, dek);
    const result = await decryptBinary(ciphertext, iv, authTag, dek);
    expect(new Uint8Array(result)).toEqual(allBytes);
  });
});

describe("Key Wrapping", () => {
  it("unwrapKey(wrapKey(dek, kek)) recovers the DEK", async () => {
    const salt = generateSalt();
    const kek = await deriveKEK("wrap-test", salt, FAST_ITERATIONS);
    const dek = await generateDEK();
    const dekRaw = await exportDEK(dek);

    const { wrapped, iv, tag } = await wrapKey(dekRaw, kek);
    const unwrapped = await unwrapKey(wrapped, iv, tag, kek);
    expect(unwrapped).toEqual(dekRaw);

    const importedDek = await importDEK(unwrapped);
    const enc = await encrypt("verify wrapping", dek);
    const dec = await decrypt(enc.ciphertext, enc.iv, enc.authTag, importedDek);
    expect(dec).toBe("verify wrapping");
  });

  it("unwrap with wrong key throws", async () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const kek1 = await deriveKEK("key-a", salt1, FAST_ITERATIONS);
    const kek2 = await deriveKEK("key-b", salt2, FAST_ITERATIONS);

    const dek = await generateDEK();
    const dekRaw = await exportDEK(dek);

    const { wrapped, iv, tag } = await wrapKey(dekRaw, kek1);
    await expect(unwrapKey(wrapped, iv, tag, kek2)).rejects.toThrow();
  });

  it("wrapped output differs from raw key bytes", async () => {
    const salt = generateSalt();
    const kek = await deriveKEK("wrap-diff", salt, FAST_ITERATIONS);
    const dek = await generateDEK();
    const dekRaw = await exportDEK(dek);

    const { wrapped } = await wrapKey(dekRaw, kek);
    const rawB64 = toBase64(dekRaw.buffer as ArrayBuffer);
    expect(wrapped).not.toBe(rawB64);
  });
});

describe("ECDH Key Exchange", () => {
  it("generateKeyPair produces publicKey and privateKeyRaw", async () => {
    const pair = await generateKeyPair();
    expect(typeof pair.publicKey).toBe("string");
    expect(pair.publicKey.length).toBeGreaterThan(0);
    expect(pair.privateKeyRaw).toBeInstanceOf(Uint8Array);
    expect(pair.privateKeyRaw.length).toBeGreaterThan(0);
  });

  it("two parties derive the same shared key", async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();

    const alicePriv = await importPrivateKey(alice.privateKeyRaw);
    const bobPriv = await importPrivateKey(bob.privateKeyRaw);

    const sharedAB = await deriveSharedKey(alicePriv, bob.publicKey);
    const sharedBA = await deriveSharedKey(bobPriv, alice.publicKey);

    const dek = await generateDEK();
    const dekRaw = await exportDEK(dek);

    const wrapped = await wrapKey(dekRaw, sharedAB);
    const unwrapped = await unwrapKey(wrapped.wrapped, wrapped.iv, wrapped.tag, sharedBA);
    expect(unwrapped).toEqual(dekRaw);
  });

  it("wrap DEK with shared key, other party unwraps successfully", async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();

    const alicePriv = await importPrivateKey(alice.privateKeyRaw);
    const bobPriv = await importPrivateKey(bob.privateKeyRaw);

    const sharedAlice = await deriveSharedKey(alicePriv, bob.publicKey);
    const sharedBob = await deriveSharedKey(bobPriv, alice.publicKey);

    const dek = await generateDEK();
    const dekRaw = await exportDEK(dek);

    const wrapped = await wrapKey(dekRaw, sharedAlice);
    const unwrapped = await unwrapKey(wrapped.wrapped, wrapped.iv, wrapped.tag, sharedBob);
    const recoveredDek = await importDEK(unwrapped);

    const enc = await encrypt("ecdh test message", dek);
    const dec = await decrypt(enc.ciphertext, enc.iv, enc.authTag, recoveredDek);
    expect(dec).toBe("ecdh test message");
  });
});

describe("Recovery Key", () => {
  it("generateRecoveryKey returns formatted string with dashes", () => {
    const key = generateRecoveryKey();
    const parts = key.split("-");
    expect(parts.length).toBeGreaterThanOrEqual(11);
    for (const part of parts) {
      expect(part.length).toBeGreaterThan(0);
      expect(part.length).toBeLessThanOrEqual(4);
    }
  });

  it("recoveryKeyToBytes returns 32 bytes (256-bit key)", () => {
    const key = generateRecoveryKey();
    const bytes = recoveryKeyToBytes(key);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(32);
  });

  it("recovery key can wrap and unwrap a DEK", async () => {
    const recoveryStr = generateRecoveryKey();
    const recoveryBytes = recoveryKeyToBytes(recoveryStr);
    const recoveryKey = await importRecoveryKey(recoveryBytes);

    const dek = await generateDEK();
    const dekRaw = await exportDEK(dek);

    const wrapped = await wrapKey(dekRaw, recoveryKey);
    const unwrapped = await unwrapKey(wrapped.wrapped, wrapped.iv, wrapped.tag, recoveryKey);
    expect(unwrapped).toEqual(dekRaw);

    const importedDek = await importDEK(unwrapped);
    const enc = await encrypt("recovery test", dek);
    const dec = await decrypt(enc.ciphertext, enc.iv, enc.authTag, importedDek);
    expect(dec).toBe("recovery test");
  });
});

describe("Share Key", () => {
  it("generateShareKey produces raw bytes and CryptoKey", async () => {
    const { raw, key } = await generateShareKey();
    expect(raw).toBeInstanceOf(Uint8Array);
    expect(raw.length).toBe(32);
    expect(key).toBeInstanceOf(CryptoKey);
  });

  it("shareKeyToFragment → shareKeyFromFragment round-trip", async () => {
    const { raw, key: originalKey } = await generateShareKey();
    const fragment = shareKeyToFragment(raw);
    expect(typeof fragment).toBe("string");
    expect(fragment.length).toBeGreaterThan(0);

    const recoveredKey = await shareKeyFromFragment(fragment);
    expect(recoveredKey).toBeInstanceOf(CryptoKey);

    const enc = await encrypt("share link data", originalKey);
    const dec = await decrypt(enc.ciphertext, enc.iv, enc.authTag, recoveredKey);
    expect(dec).toBe("share link data");
  });

  it("encrypt with share key, decrypt with recovered key", async () => {
    const { raw, key } = await generateShareKey();

    const enc = await encrypt("one-time secret", key);

    const fragment = shareKeyToFragment(raw);
    const recovered = await shareKeyFromFragment(fragment);

    const dec = await decrypt(enc.ciphertext, enc.iv, enc.authTag, recovered);
    expect(dec).toBe("one-time secret");
  });
});

describe("CI Token Key", () => {
  it("deriveCIWrapKey is deterministic for same token", async () => {
    const token = "ci-token-abc-123";
    const key1 = await deriveCIWrapKey(token);
    const key2 = await deriveCIWrapKey(token);

    const dek = await generateDEK();
    const dekRaw = await exportDEK(dek);

    const wrapped = await wrapKey(dekRaw, key1);
    const unwrapped = await unwrapKey(wrapped.wrapped, wrapped.iv, wrapped.tag, key2);
    expect(unwrapped).toEqual(dekRaw);
  });

  it("different tokens produce different keys", async () => {
    const key1 = await deriveCIWrapKey("token-one");
    const key2 = await deriveCIWrapKey("token-two");

    const dek = await generateDEK();
    const dekRaw = await exportDEK(dek);

    const wrapped = await wrapKey(dekRaw, key1);
    await expect(unwrapKey(wrapped.wrapped, wrapped.iv, wrapped.tag, key2)).rejects.toThrow();
  });

  it("wrap DEK with CI key, unwrap with same token succeeds", async () => {
    const token = "my-ci-pipeline-token";
    const ciKey = await deriveCIWrapKey(token);

    const dek = await generateDEK();
    const dekRaw = await exportDEK(dek);

    const { wrapped, iv, tag } = await wrapKey(dekRaw, ciKey);

    const ciKey2 = await deriveCIWrapKey(token);
    const unwrapped = await unwrapKey(wrapped, iv, tag, ciKey2);
    const importedDek = await importDEK(unwrapped);

    const enc = await encrypt("ci secret value", dek);
    const dec = await decrypt(enc.ciphertext, enc.iv, enc.authTag, importedDek);
    expect(dec).toBe("ci secret value");
  });
});
