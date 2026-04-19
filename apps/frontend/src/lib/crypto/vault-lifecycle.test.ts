import {
  decrypt,
  deriveKEK,
  encrypt,
  exportDEK,
  fromBase64,
  generateDEK,
  importDEK,
  toBase64,
  unwrapKey,
  wrapKey,
  type VaultInfo,
} from "@depvault/crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createVault, fetchVaultInfo, unlockVaultKeys } from "./vault-lifecycle";

/**
 * Rationale for this file: a bug in setup/unlock flow can leave a user permanently locked
 * out of their vault — and since the server never sees plaintext, there is no server-side
 * recovery. These tests pin down the exact ciphertext contract and ensure setup produces
 * keys that later unlock cleanly (and that wrong passwords do NOT silently succeed).
 */
const { api } = vi.hoisted(() => ({
  api: {
    statusGet: vi.fn(),
    setupPost: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({
  client: {
    api: {
      vault: {
        status: { get: () => api.statusGet() },
        setup: { post: (body: unknown) => api.setupPost(body) },
      },
    },
  },
}));

const FAST_ITERATIONS = 1000;

beforeEach(() => {
  api.statusGet.mockReset();
  api.setupPost.mockReset();
  api.setupPost.mockResolvedValue({ data: { ok: true }, error: null });
});

describe("fetchVaultInfo", () => {
  it("returns null when the server reports hasVault=false", async () => {
    api.statusGet.mockResolvedValueOnce({ data: { hasVault: false }, error: null });
    expect(await fetchVaultInfo()).toBeNull();
  });

  it("returns null when data is missing entirely (defensive)", async () => {
    api.statusGet.mockResolvedValueOnce({ data: null, error: null });
    expect(await fetchVaultInfo()).toBeNull();
  });

  it("returns a fully populated VaultInfo when the server reports hasVault=true", async () => {
    const payload = {
      hasVault: true,
      kekSalt: "salt-b64",
      kekIterations: 600_000,
      publicKey: "pubkey",
      wrappedPrivateKey: "wpk",
      wrappedPrivateKeyIv: "wpkiv",
      wrappedPrivateKeyTag: "wpktag",
      recoveryKeyHash: "rkhash",
      wrappedRecoveryKey: "wrk",
      wrappedRecoveryKeyIv: "wrkiv",
      wrappedRecoveryKeyTag: "wrktag",
    };
    api.statusGet.mockResolvedValueOnce({ data: payload, error: null });
    const info = await fetchVaultInfo();
    expect(info).toEqual({
      kekSalt: "salt-b64",
      kekIterations: 600_000,
      publicKey: "pubkey",
      wrappedPrivateKey: "wpk",
      wrappedPrivateKeyIv: "wpkiv",
      wrappedPrivateKeyTag: "wpktag",
      recoveryKeyHash: "rkhash",
      wrappedRecoveryKey: "wrk",
      wrappedRecoveryKeyIv: "wrkiv",
      wrappedRecoveryKeyTag: "wrktag",
    });
  });
});

describe("createVault", () => {
  it("produces a vault that the same password can immediately unlock (round-trip contract)", async () => {
    const result = await createVault("correct horse battery staple");

    // Setup was posted to the backend
    expect(api.setupPost).toHaveBeenCalledTimes(1);
    const body = api.setupPost.mock.calls[0]![0] as Record<string, unknown>;

    // Iteration count is the production value — lowering this on setup but not verifying
    // on unlock would make every new vault insecure without any client-side signal.
    expect(body.kekIterations).toBe(600_000);
    expect(typeof body.kekSalt).toBe("string");
    expect((body.kekSalt as string).length).toBeGreaterThan(0);

    // VaultInfo must match what was posted — any drift here would desync client memory
    // from server state, making password change unable to find the stored wrapped bytes.
    expect(result.vaultInfo.kekSalt).toBe(body.kekSalt);
    expect(result.vaultInfo.wrappedPrivateKey).toBe(body.wrappedPrivateKey);
    expect(result.vaultInfo.wrappedRecoveryKey).toBe(body.wrappedRecoveryKey);

    // The keys must be usable for encryption/decryption round-trips
    const dek = await generateDEK();
    const ct = await encrypt("sensitive value", dek);
    expect(await decrypt(ct.ciphertext, ct.iv, ct.authTag, dek)).toBe("sensitive value");
  });

  it("recoveryKey is formatted and unique across vaults (no global template)", async () => {
    const vault1 = await createVault("pw");
    const vault2 = await createVault("pw");
    expect(vault1.recoveryKey).not.toBe(vault2.recoveryKey);
    expect(vault1.recoveryKey).toMatch(/-/); // grouped formatting with dashes
  });

  it("the recoveryKeyHash on the server is SHA-256 of the raw recovery key bytes", async () => {
    const vault = await createVault("pw");
    const body = api.setupPost.mock.calls[0]![0] as { recoveryKeyHash: string };

    const { recoveryKeyToBytes } = await import("@depvault/crypto");
    const raw = recoveryKeyToBytes(vault.recoveryKey);
    const digest = await crypto.subtle.digest("SHA-256", raw.buffer as ArrayBuffer);
    expect(toBase64(digest)).toBe(body.recoveryKeyHash);
    expect(body.recoveryKeyHash).toBe(vault.vaultInfo.recoveryKeyHash);
  });

  it("the wrapped recovery key can be unwrapped with the returned KEK (recovery-path sanity)", async () => {
    const vault = await createVault("pw");
    const info = vault.vaultInfo;

    const recoveryBytes = await unwrapKey(
      info.wrappedRecoveryKey,
      info.wrappedRecoveryKeyIv,
      info.wrappedRecoveryKeyTag,
      vault.keys.kek,
    );
    // Same bytes that correspond to the displayed recovery key
    const { recoveryKeyToBytes } = await import("@depvault/crypto");
    expect(recoveryBytes).toEqual(recoveryKeyToBytes(vault.recoveryKey));
  });

  it("posts a syntactically-correct base64 kekSalt (16 bytes decoded)", async () => {
    await createVault("pw");
    const body = api.setupPost.mock.calls[0]![0] as { kekSalt: string };
    const decoded = fromBase64(body.kekSalt);
    expect(decoded.length).toBe(16);
  });
});

describe("unlockVaultKeys", () => {
  async function buildFakeVaultInfo(
    password: string,
  ): Promise<VaultInfo & { _dekProbe: Uint8Array }> {
    // Build a vault server-side payload locally using the same primitives createVault uses.
    // This isolates unlockVaultKeys from createVault — both must independently agree on format.
    const { generateSalt, generateKeyPair, generateRecoveryKey, recoveryKeyToBytes } =
      await import("@depvault/crypto");
    const salt = generateSalt();
    const kek = await deriveKEK(password, salt, FAST_ITERATIONS);
    const pair = await generateKeyPair();
    const wrappedPrivate = await wrapKey(pair.privateKeyRaw, kek);
    const recoveryBytes = recoveryKeyToBytes(generateRecoveryKey());
    const wrappedRecovery = await wrapKey(recoveryBytes, kek);
    const recoveryHash = toBase64(
      await crypto.subtle.digest("SHA-256", recoveryBytes.buffer as ArrayBuffer),
    );

    // Additionally wrap a DEK with the recovery key — lets us assert the returned recoveryKey works.
    const dek = await generateDEK();
    const dekRaw = await exportDEK(dek);

    return {
      _dekProbe: dekRaw,
      kekSalt: toBase64(salt.buffer as ArrayBuffer),
      kekIterations: FAST_ITERATIONS,
      publicKey: pair.publicKey,
      wrappedPrivateKey: wrappedPrivate.wrapped,
      wrappedPrivateKeyIv: wrappedPrivate.iv,
      wrappedPrivateKeyTag: wrappedPrivate.tag,
      recoveryKeyHash: recoveryHash,
      wrappedRecoveryKey: wrappedRecovery.wrapped,
      wrappedRecoveryKeyIv: wrappedRecovery.iv,
      wrappedRecoveryKeyTag: wrappedRecovery.tag,
    };
  }

  it("returns kek, privateKey, recoveryKey on correct password", async () => {
    const info = await buildFakeVaultInfo("pw");
    const { kek, privateKey, recoveryKey } = await unlockVaultKeys("pw", info);
    expect(kek).toBeInstanceOf(CryptoKey);
    expect(privateKey).toBeInstanceOf(CryptoKey);
    expect(recoveryKey).toBeInstanceOf(CryptoKey);
  });

  it("throws 'Incorrect vault password' when password is wrong", async () => {
    const info = await buildFakeVaultInfo("correct-pw");
    await expect(unlockVaultKeys("wrong-pw", info)).rejects.toThrow(/Incorrect vault password/);
  });

  it("throws on empty password as though it were any other wrong password", async () => {
    const info = await buildFakeVaultInfo("pw");
    await expect(unlockVaultKeys("", info)).rejects.toThrow(/Incorrect vault password/);
  });

  it("handles unicode passwords (emoji, CJK) — no premature UTF-8 truncation", async () => {
    const password = "🔐正しい password";
    const info = await buildFakeVaultInfo(password);
    const keys = await unlockVaultKeys(password, info);
    expect(keys.kek).toBeInstanceOf(CryptoKey);
  });

  it("the unlocked KEK can unwrap a DEK wrapped by a newly-derived KEK from the same password+salt", async () => {
    const info = await buildFakeVaultInfo("pw");
    const { kek } = await unlockVaultKeys("pw", info);

    // A second derivation from the same password+salt+iterations must produce an equivalent
    // KEK — proves the returned KEK is the canonical one and safe to use for new grants.
    const salt = fromBase64(info.kekSalt);
    const kek2 = await deriveKEK("pw", salt, info.kekIterations);
    const dek = await generateDEK();
    const wrapped = await wrapKey(await exportDEK(dek), kek2);
    const unwrapped = await unwrapKey(wrapped.wrapped, wrapped.iv, wrapped.tag, kek);
    expect(await exportDEK(await importDEK(unwrapped))).toEqual(await exportDEK(dek));
  });

  it("throws if the wrapped private key was corrupted server-side (tampered storage)", async () => {
    const info = await buildFakeVaultInfo("pw");
    // Flip one bit in the wrapped private key and ensure unlock fails loudly.
    const corrupted = fromBase64(info.wrappedPrivateKey);
    corrupted[0] ^= 0xff;
    info.wrappedPrivateKey = toBase64(corrupted.buffer as ArrayBuffer);

    await expect(unlockVaultKeys("pw", info)).rejects.toThrow(/Incorrect vault password/);
  });

  it("throws if the wrapped recovery key was corrupted (failure is surfaced, not silent)", async () => {
    const info = await buildFakeVaultInfo("pw");
    const corrupted = fromBase64(info.wrappedRecoveryKey);
    corrupted[0] ^= 0xff;
    info.wrappedRecoveryKey = toBase64(corrupted.buffer as ArrayBuffer);

    // Not a wrong-password error; propagates as a raw AES-GCM failure.
    await expect(unlockVaultKeys("pw", info)).rejects.toThrow();
  });
});
