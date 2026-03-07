import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { decrypt, decryptBinary, deriveProjectKey, encrypt, encryptBinary } from "./encryption";

const TEST_MASTER_KEY = "a".repeat(64);

beforeAll(() => {
  process.env.MASTER_ENCRYPTION_KEY = TEST_MASTER_KEY;
});

afterAll(() => {
  process.env.MASTER_ENCRYPTION_KEY = undefined as unknown as string;
});

function getProjectKey(id = "test-project"): Buffer {
  return deriveProjectKey(id);
}

describe("deriveProjectKey", () => {
  it("should derive a 32-byte key from project ID", () => {
    const key = deriveProjectKey("project-123");
    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });

  it("should derive different keys for different project IDs", () => {
    const key1 = deriveProjectKey("project-1");
    const key2 = deriveProjectKey("project-2");
    expect(key1.equals(key2)).toBe(false);
  });

  it("should derive the same key for the same project ID", () => {
    const key1 = deriveProjectKey("project-1");
    const key2 = deriveProjectKey("project-1");
    expect(key1.equals(key2)).toBe(true);
  });
});

describe("encrypt / decrypt", () => {
  it("should round-trip a simple string", () => {
    const plaintext = "hello world";
    const encrypted = encrypt(plaintext, getProjectKey());
    const decrypted = decrypt(
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.authTag,
      getProjectKey(),
    );
    expect(decrypted).toBe(plaintext);
  });

  it("should round-trip an empty string", () => {
    const plaintext = "";
    const encrypted = encrypt(plaintext, getProjectKey());
    const decrypted = decrypt(
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.authTag,
      getProjectKey(),
    );
    expect(decrypted).toBe(plaintext);
  });

  it("should round-trip unicode characters", () => {
    const plaintext = "こんにちは世界 🌍 émojis café";
    const encrypted = encrypt(plaintext, getProjectKey());
    const decrypted = decrypt(
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.authTag,
      getProjectKey(),
    );
    expect(decrypted).toBe(plaintext);
  });

  it("should round-trip multiline text", () => {
    const plaintext = "DATABASE_URL=postgres://...\nJWT_SECRET=supersecret\nPORT=3000";
    const encrypted = encrypt(plaintext, getProjectKey());
    const decrypted = decrypt(
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.authTag,
      getProjectKey(),
    );
    expect(decrypted).toBe(plaintext);
  });

  it("should round-trip large values", () => {
    const plaintext = "x".repeat(100_000);
    const encrypted = encrypt(plaintext, getProjectKey());
    const decrypted = decrypt(
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.authTag,
      getProjectKey(),
    );
    expect(decrypted).toBe(plaintext);
  });

  it("should produce different ciphertext for the same plaintext (random IV)", () => {
    const plaintext = "same input";
    const enc1 = encrypt(plaintext, getProjectKey());
    const enc2 = encrypt(plaintext, getProjectKey());
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
    expect(enc1.iv).not.toBe(enc2.iv);
  });

  it("should return base64-encoded ciphertext, iv, and authTag", () => {
    const encrypted = encrypt("test", getProjectKey());
    expect(() => Buffer.from(encrypted.ciphertext, "base64")).not.toThrow();
    expect(() => Buffer.from(encrypted.iv, "base64")).not.toThrow();
    expect(() => Buffer.from(encrypted.authTag, "base64")).not.toThrow();
  });

  it("should fail decryption with wrong key", () => {
    const encrypted = encrypt("secret", getProjectKey());
    const wrongKey = deriveProjectKey("wrong-project");
    expect(() =>
      decrypt(encrypted.ciphertext, encrypted.iv, encrypted.authTag, wrongKey),
    ).toThrow();
  });

  it("should fail decryption with tampered ciphertext", () => {
    const encrypted = encrypt("secret", getProjectKey());
    const tampered = Buffer.from(encrypted.ciphertext, "base64");
    tampered[0]! ^= 0xff;
    expect(() =>
      decrypt(tampered.toString("base64"), encrypted.iv, encrypted.authTag, getProjectKey()),
    ).toThrow();
  });

  it("should fail decryption with tampered authTag", () => {
    const encrypted = encrypt("secret", getProjectKey());
    const tampered = Buffer.from(encrypted.authTag, "base64");
    tampered[0]! ^= 0xff;
    expect(() =>
      decrypt(encrypted.ciphertext, encrypted.iv, tampered.toString("base64"), getProjectKey()),
    ).toThrow();
  });
});

describe("encryptBinary / decryptBinary", () => {
  it("should round-trip binary data", () => {
    const data = Buffer.from([0x00, 0x01, 0xff, 0xfe, 0x80, 0x7f]);
    const encrypted = encryptBinary(data, getProjectKey());
    const decrypted = decryptBinary(
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.authTag,
      getProjectKey(),
    );
    expect(decrypted.equals(data)).toBe(true);
  });

  it("should round-trip an empty buffer", () => {
    const data = Buffer.alloc(0);
    const encrypted = encryptBinary(data, getProjectKey());
    const decrypted = decryptBinary(
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.authTag,
      getProjectKey(),
    );
    expect(decrypted.equals(data)).toBe(true);
  });

  it("should round-trip a large binary file", () => {
    const data = Buffer.alloc(1_000_000, 0xab);
    const encrypted = encryptBinary(data, getProjectKey());
    const decrypted = decryptBinary(
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.authTag,
      getProjectKey(),
    );
    expect(decrypted.equals(data)).toBe(true);
  });

  it("should return ciphertext as Buffer", () => {
    const encrypted = encryptBinary(Buffer.from("test"), getProjectKey());
    expect(encrypted.ciphertext).toBeInstanceOf(Buffer);
  });

  it("should fail decryption with wrong key", () => {
    const encrypted = encryptBinary(Buffer.from("secret"), getProjectKey());
    const wrongKey = deriveProjectKey("wrong-project");
    expect(() =>
      decryptBinary(encrypted.ciphertext, encrypted.iv, encrypted.authTag, wrongKey),
    ).toThrow();
  });
});
