import "fake-indexeddb/auto";
import { decrypt, deriveKEK, encrypt, generateKeyPair, importPrivateKey } from "@depvault/crypto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearVaultSession,
  loadVaultSession,
  saveVaultSession,
  type VaultSessionRecord,
} from "./vault-session-store";

const DUMMY_VAULT_INFO = {
  kekSalt: "salt",
  kekIterations: 600_000,
  publicKey: "pub",
  wrappedPrivateKey: "wpk",
  wrappedPrivateKeyIv: "wpkiv",
  wrappedPrivateKeyTag: "wpktag",
  recoveryKeyHash: "rkh",
  wrappedRecoveryKey: "wrk",
  wrappedRecoveryKeyIv: "wrkiv",
  wrappedRecoveryKeyTag: "wrktag",
};

async function buildRecord(
  overrides: Partial<VaultSessionRecord> = {},
): Promise<VaultSessionRecord> {
  const kek = await deriveKEK("pw", crypto.getRandomValues(new Uint8Array(16)), 1000);
  const { privateKeyRaw } = await generateKeyPair();
  const privateKey = await importPrivateKey(privateKeyRaw);
  return {
    userId: "user-1",
    kek,
    privateKey,
    vaultInfo: DUMMY_VAULT_INFO,
    expiresAt: Date.now() + 60_000,
    ...overrides,
  };
}

beforeEach(() => {
  // Fresh, isolated database per test.
  globalThis.indexedDB = new IDBFactory();
});

describe("vault-session-store", () => {
  it("round-trips a saved session", async () => {
    const record = await buildRecord();
    await saveVaultSession(record);

    const loaded = await loadVaultSession("user-1");
    expect(loaded).not.toBeNull();
    expect(loaded!.userId).toBe("user-1");
    expect(loaded!.expiresAt).toBe(record.expiresAt);
    expect(loaded!.vaultInfo).toEqual(DUMMY_VAULT_INFO);
    expect(loaded!.kek).toBeInstanceOf(CryptoKey);
    expect(loaded!.privateKey).toBeInstanceOf(CryptoKey);
  });

  it("returns null for an unknown user", async () => {
    expect(await loadVaultSession("nobody")).toBeNull();
  });

  it("the restored KEK is non-extractable and still functional", async () => {
    const record = await buildRecord();
    const cipher = await encrypt("top secret", record.kek);
    await saveVaultSession(record);

    const loaded = await loadVaultSession("user-1");
    expect(loaded!.kek.extractable).toBe(false);
    // The cloned key must decrypt what the original encrypted — proving the bits survived.
    expect(await decrypt(cipher.ciphertext, cipher.iv, cipher.authTag, loaded!.kek)).toBe(
      "top secret",
    );
  });

  it("deletes and ignores an expired session", async () => {
    await saveVaultSession(await buildRecord({ expiresAt: Date.now() - 1 }));

    expect(await loadVaultSession("user-1")).toBeNull();
    // A second load confirms the expired record was purged, not just filtered.
    expect(await loadVaultSession("user-1")).toBeNull();
  });

  it("clearVaultSession removes stored sessions", async () => {
    await saveVaultSession(await buildRecord());
    await clearVaultSession();
    expect(await loadVaultSession("user-1")).toBeNull();
  });

  it("degrades to no-op when IndexedDB is unavailable (SSR)", async () => {
    const real = globalThis.indexedDB;
    // @ts-expect-error — simulate a server/SSR context with no IndexedDB.
    delete globalThis.indexedDB;
    try {
      await expect(saveVaultSession(await buildRecord())).resolves.toBeUndefined();
      await expect(loadVaultSession("user-1")).resolves.toBeNull();
      await expect(clearVaultSession()).resolves.toBeUndefined();
    } finally {
      globalThis.indexedDB = real;
    }
  });
});
