import {
  deriveKEK,
  exportDEK,
  fromBase64,
  generateDEK,
  generateKeyPair,
  generateRecoveryKey,
  generateSalt,
  importDEK,
  importPrivateKey,
  importRecoveryKey,
  recoveryKeyToBytes,
  toBase64,
  unwrapKey,
  wrapKey,
  type VaultInfo,
} from "@depvault/crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { changeVaultPasswordOps, recoverVaultOps, regenerateRecoveryKeyOps } from "./vault-rekey";

/**
 * Re-key operations are the highest-risk code in the frontend: a bug that drops or
 * wrong-wraps a DEK during re-key leaves the user unable to decrypt their own data and
 * the backend has no copy. These tests cover both the happy path (all DEKs re-wrapped
 * under the new key) and the dangerous edge cases (cached-only DEKs, SELF grants not in
 * cache, server-returned grants that must be unwrapped with the OLD key first).
 */
const { api } = vi.hoisted(() => ({
  api: {
    selfGrantsGet: vi.fn(),
    recoveryGrantsGet: vi.fn(),
    passwordPut: vi.fn(),
    recoverPost: vi.fn(),
    recoveryKeyPut: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({
  client: {
    api: {
      vault: {
        keygrants: {
          self: { get: () => api.selfGrantsGet() },
          recovery: { get: () => api.recoveryGrantsGet() },
        },
        password: { put: (body: unknown) => api.passwordPut(body) },
        recover: { post: (body: unknown) => api.recoverPost(body) },
        recoverykey: { put: (body: unknown) => api.recoveryKeyPut(body) },
      },
    },
  },
}));

const FAST_ITERATIONS = 1000;

async function buildVault(password: string) {
  const salt = generateSalt();
  const kek = await deriveKEK(password, salt, FAST_ITERATIONS);
  const keyPair = await generateKeyPair();
  const wrappedPrivate = await wrapKey(keyPair.privateKeyRaw, kek);

  const recoveryFormatted = generateRecoveryKey();
  const recoveryBytes = recoveryKeyToBytes(recoveryFormatted);
  const recoveryKey = await importRecoveryKey(recoveryBytes);
  const wrappedRecovery = await wrapKey(recoveryBytes, kek);
  const recoveryHash = toBase64(
    await crypto.subtle.digest("SHA-256", recoveryBytes.buffer as ArrayBuffer),
  );

  const vaultInfo: VaultInfo = {
    kekSalt: toBase64(salt.buffer as ArrayBuffer),
    kekIterations: FAST_ITERATIONS,
    publicKey: keyPair.publicKey,
    wrappedPrivateKey: wrappedPrivate.wrapped,
    wrappedPrivateKeyIv: wrappedPrivate.iv,
    wrappedPrivateKeyTag: wrappedPrivate.tag,
    recoveryKeyHash: recoveryHash,
    wrappedRecoveryKey: wrappedRecovery.wrapped,
    wrappedRecoveryKeyIv: wrappedRecovery.iv,
    wrappedRecoveryKeyTag: wrappedRecovery.tag,
  };

  return {
    kek,
    keyPair,
    recoveryFormatted,
    recoveryBytes,
    recoveryKey,
    vaultInfo,
  };
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  api.passwordPut.mockResolvedValue({ data: { ok: true }, error: null });
  api.recoverPost.mockResolvedValue({ data: { ok: true }, error: null });
  api.recoveryKeyPut.mockResolvedValue({ data: { ok: true }, error: null });
  // Default: no server-side grants unless a test opts in.
  api.selfGrantsGet.mockResolvedValue({ data: [], error: null });
  api.recoveryGrantsGet.mockResolvedValue({ data: [], error: null });
});

describe("changeVaultPasswordOps", () => {
  it("re-wraps all cached DEKs under the new KEK so every project is still unlockable", async () => {
    const { kek, vaultInfo } = await buildVault("old-pw");

    const dek1 = await generateDEK();
    const dek2 = await generateDEK();
    const cache = new Map<string, CryptoKey>([
      ["proj-a", dek1],
      ["proj-b", dek2],
    ]);

    const result = await changeVaultPasswordOps("new-pw", kek, vaultInfo, cache);

    // PUT body inspection
    expect(api.passwordPut).toHaveBeenCalledTimes(1);
    const body = api.passwordPut.mock.calls[0]![0] as {
      newKekSalt: string;
      newKekIterations: number;
      updatedGrants: Array<{
        projectId: string;
        wrappedDek: string;
        wrappedDekIv: string;
        wrappedDekTag: string;
      }>;
    };

    expect(body.newKekIterations).toBe(600_000);
    expect(new Set(body.updatedGrants.map((g) => g.projectId))).toEqual(
      new Set(["proj-a", "proj-b"]),
    );

    // Each updated grant must unwrap under the NEW KEK and yield the original DEK bytes.
    // If this fails the user has silently lost access to encrypted data.
    const originalA = await exportDEK(dek1);
    const originalB = await exportDEK(dek2);

    for (const g of body.updatedGrants) {
      const raw = await unwrapKey(g.wrappedDek, g.wrappedDekIv, g.wrappedDekTag, result.kek);
      const expected = g.projectId === "proj-a" ? originalA : originalB;
      expect(raw).toEqual(expected);
    }
  });

  it("unwraps SELF grants NOT in cache using OLD KEK, then re-wraps with new KEK", async () => {
    const { kek, vaultInfo } = await buildVault("old-pw");

    // Server returns a SELF grant that is NOT in the in-memory cache — e.g. another project
    // the user has access to but hasn't opened this session. The re-key MUST still pick it up.
    const serverOnlyDek = await generateDEK();
    const serverWrapped = await wrapKey(await exportDEK(serverOnlyDek), kek);

    api.selfGrantsGet.mockResolvedValueOnce({
      data: [
        {
          projectId: "proj-server",
          wrappedDek: serverWrapped.wrapped,
          wrappedDekIv: serverWrapped.iv,
          wrappedDekTag: serverWrapped.tag,
        },
      ],
      error: null,
    });

    const result = await changeVaultPasswordOps("new-pw", kek, vaultInfo, new Map());
    const body = api.passwordPut.mock.calls[0]![0] as {
      updatedGrants: Array<{
        projectId: string;
        wrappedDek: string;
        wrappedDekIv: string;
        wrappedDekTag: string;
      }>;
    };

    const projServer = body.updatedGrants.find((g) => g.projectId === "proj-server");
    expect(projServer).toBeDefined();

    const raw = await unwrapKey(
      projServer!.wrappedDek,
      projServer!.wrappedDekIv,
      projServer!.wrappedDekTag,
      result.kek,
    );
    expect(raw).toEqual(await exportDEK(serverOnlyDek));
  });

  it("prefers cached DEK when both cache and server have an entry for the same project", async () => {
    const { kek, vaultInfo } = await buildVault("old-pw");

    // Cache has the correct DEK. The server copy would also work, but the cache is treated
    // as source-of-truth to avoid an unnecessary unwrap with the old KEK.
    const cachedDek = await generateDEK();
    const serverWrapped = await wrapKey(await exportDEK(cachedDek), kek);
    api.selfGrantsGet.mockResolvedValueOnce({
      data: [
        {
          projectId: "p",
          wrappedDek: serverWrapped.wrapped,
          wrappedDekIv: serverWrapped.iv,
          wrappedDekTag: serverWrapped.tag,
        },
      ],
      error: null,
    });

    const result = await changeVaultPasswordOps(
      "new-pw",
      kek,
      vaultInfo,
      new Map([["p", cachedDek]]),
    );

    const body = api.passwordPut.mock.calls[0]![0] as {
      updatedGrants: Array<{
        projectId: string;
        wrappedDek: string;
        wrappedDekIv: string;
        wrappedDekTag: string;
      }>;
    };
    const entry = body.updatedGrants.find((g) => g.projectId === "p")!;
    const raw = await unwrapKey(
      entry.wrappedDek,
      entry.wrappedDekIv,
      entry.wrappedDekTag,
      result.kek,
    );
    expect(raw).toEqual(await exportDEK(cachedDek));

    // Only one grant — cache and server matched on the same projectId
    expect(body.updatedGrants.filter((g) => g.projectId === "p").length).toBe(1);
  });

  it("the re-wrapped private key bytes match the original wrapped bytes (same key, new wrap)", async () => {
    const { kek, keyPair, vaultInfo } = await buildVault("old-pw");
    const result = await changeVaultPasswordOps("new-pw", kek, vaultInfo, new Map());

    const raw = await unwrapKey(
      result.wrappedPrivateKey,
      result.wrappedPrivateKeyIv,
      result.wrappedPrivateKeyTag,
      result.kek,
    );
    expect(raw).toEqual(keyPair.privateKeyRaw);
  });

  it("the re-wrapped recovery key bytes equal the original recovery bytes (recovery still works)", async () => {
    const { kek, recoveryBytes, vaultInfo } = await buildVault("old-pw");
    const result = await changeVaultPasswordOps("new-pw", kek, vaultInfo, new Map());

    const raw = await unwrapKey(
      result.wrappedRecoveryKey,
      result.wrappedRecoveryKeyIv,
      result.wrappedRecoveryKeyTag,
      result.kek,
    );
    expect(raw).toEqual(recoveryBytes);
  });

  it("a new random salt is generated each call — never reuses the server's old salt", async () => {
    const { kek, vaultInfo } = await buildVault("old-pw");
    const r1 = await changeVaultPasswordOps("new-pw", kek, vaultInfo, new Map());
    expect(r1.kekSalt).not.toBe(vaultInfo.kekSalt);
  });

  it("the newly derived KEK is NOT interchangeable with the old KEK", async () => {
    const { kek, vaultInfo } = await buildVault("old-pw");
    const dek = await generateDEK();
    const result = await changeVaultPasswordOps("new-pw", kek, vaultInfo, new Map([["p", dek]]));

    const body = api.passwordPut.mock.calls[0]![0] as {
      updatedGrants: Array<{
        projectId: string;
        wrappedDek: string;
        wrappedDekIv: string;
        wrappedDekTag: string;
      }>;
    };
    const entry = body.updatedGrants.find((g) => g.projectId === "p")!;

    // Unwrap with the OLD KEK must fail — the grant is not readable without the new password.
    await expect(
      unwrapKey(entry.wrappedDek, entry.wrappedDekIv, entry.wrappedDekTag, kek),
    ).rejects.toThrow();

    // Unwrap with the new KEK must succeed.
    await expect(
      unwrapKey(entry.wrappedDek, entry.wrappedDekIv, entry.wrappedDekTag, result.kek),
    ).resolves.toBeDefined();
  });

  it("works with an empty cache and no server-side grants (new user with no projects)", async () => {
    const { kek, vaultInfo } = await buildVault("old-pw");
    const result = await changeVaultPasswordOps("new-pw", kek, vaultInfo, new Map());
    const body = api.passwordPut.mock.calls[0]![0] as { updatedGrants: unknown[] };
    expect(body.updatedGrants).toEqual([]);
    expect(result.kek).toBeInstanceOf(CryptoKey);
  });

  it("handles many projects with a mix of cache-only, server-only, and both sources (no project left behind)", async () => {
    // Simulates the realistic case: a power user with 10 projects. Four are open in the
    // current tab (cache), four are on the server only (other tabs / other devices), and
    // two overlap. Every DEK must survive the re-key; none may be skipped or double-wrapped.
    const { kek, vaultInfo } = await buildVault("old-pw");

    const cacheOnlyIds = ["c1", "c2", "c3", "c4"];
    const serverOnlyIds = ["s1", "s2", "s3", "s4"];
    const bothIds = ["b1", "b2"];

    // Build DEKs and cache
    const cache = new Map<string, CryptoKey>();
    const expectedRaw = new Map<string, Uint8Array>();
    for (const id of [...cacheOnlyIds, ...bothIds]) {
      const d = await generateDEK();
      cache.set(id, d);
      expectedRaw.set(id, await exportDEK(d));
    }

    // Build server-side SELF grants (for serverOnlyIds with distinct DEKs, and for bothIds
    // using the SAME DEK as the cache — the resolver should prefer the cached copy).
    const serverGrants: Array<{
      projectId: string;
      wrappedDek: string;
      wrappedDekIv: string;
      wrappedDekTag: string;
    }> = [];
    for (const id of serverOnlyIds) {
      const d = await generateDEK();
      expectedRaw.set(id, await exportDEK(d));
      const w = await wrapKey(await exportDEK(d), kek);
      serverGrants.push({
        projectId: id,
        wrappedDek: w.wrapped,
        wrappedDekIv: w.iv,
        wrappedDekTag: w.tag,
      });
    }
    for (const id of bothIds) {
      // Server has a wrapped copy of the same DEK that's in cache
      const w = await wrapKey(expectedRaw.get(id)!, kek);
      serverGrants.push({
        projectId: id,
        wrappedDek: w.wrapped,
        wrappedDekIv: w.iv,
        wrappedDekTag: w.tag,
      });
    }

    api.selfGrantsGet.mockResolvedValueOnce({ data: serverGrants, error: null });

    const result = await changeVaultPasswordOps("new-pw", kek, vaultInfo, cache);
    const body = api.passwordPut.mock.calls[0]![0] as {
      updatedGrants: Array<{
        projectId: string;
        wrappedDek: string;
        wrappedDekIv: string;
        wrappedDekTag: string;
      }>;
    };

    // Every project represented exactly once — no duplicates, no omissions
    const ids = body.updatedGrants.map((g) => g.projectId).sort();
    expect(ids).toEqual([...cacheOnlyIds, ...serverOnlyIds, ...bothIds].sort());
    expect(new Set(ids).size).toBe(ids.length);

    // Each grant must unwrap under the NEW KEK back to the original DEK bytes.
    // This is the data-loss-prevention assertion: a single mis-wrap here would orphan
    // one project's encrypted secrets.
    for (const g of body.updatedGrants) {
      const raw = await unwrapKey(g.wrappedDek, g.wrappedDekIv, g.wrappedDekTag, result.kek);
      expect(raw).toEqual(expectedRaw.get(g.projectId));
    }
  });

  it("multi-project: every updated grant uses a unique IV (no GCM nonce reuse under the new KEK)", async () => {
    const { kek, vaultInfo } = await buildVault("old-pw");
    const cache = new Map<string, CryptoKey>();
    for (let i = 0; i < 8; i++) cache.set(`p${i}`, await generateDEK());

    await changeVaultPasswordOps("new-pw", kek, vaultInfo, cache);
    const body = api.passwordPut.mock.calls[0]![0] as {
      updatedGrants: Array<{ wrappedDekIv: string }>;
    };
    const ivs = body.updatedGrants.map((g) => g.wrappedDekIv);
    expect(new Set(ivs).size).toBe(ivs.length);
  });
});

describe("recoverVaultOps", () => {
  it("unwraps DEKs via RECOVERY grants, creates new SELF + RECOVERY grants, and rotates keypair", async () => {
    const { kek, recoveryFormatted, recoveryKey, keyPair } = await buildVault("old-pw");

    const projDek = await generateDEK();
    const projDekRaw = await exportDEK(projDek);
    const recoveryWrapped = await wrapKey(projDekRaw, recoveryKey);

    api.recoveryGrantsGet.mockResolvedValueOnce({
      data: [
        {
          projectId: "proj-1",
          wrappedDek: recoveryWrapped.wrapped,
          wrappedDekIv: recoveryWrapped.iv,
          wrappedDekTag: recoveryWrapped.tag,
        },
      ],
      error: null,
    });

    const result = await recoverVaultOps(recoveryFormatted, "new-pw");

    expect(api.recoverPost).toHaveBeenCalledTimes(1);
    const body = api.recoverPost.mock.calls[0]![0] as {
      newPublicKey: string;
      updatedGrants: Array<{
        projectId: string;
        grantType: "SELF" | "ECDH" | "RECOVERY";
        wrappedDek: string;
        wrappedDekIv: string;
        wrappedDekTag: string;
      }>;
    };

    // New ECDH key pair must be generated — the old private key is lost when the user forgot
    // the password, so the public key on the server must be rotated too.
    expect(body.newPublicKey).not.toBe(keyPair.publicKey);

    // Each project should get BOTH a SELF and a RECOVERY grant
    const selfGrant = body.updatedGrants.find(
      (g) => g.projectId === "proj-1" && g.grantType === "SELF",
    );
    const recoveryGrant = body.updatedGrants.find(
      (g) => g.projectId === "proj-1" && g.grantType === "RECOVERY",
    );
    expect(selfGrant).toBeDefined();
    expect(recoveryGrant).toBeDefined();

    // SELF grant must unwrap under the new KEK and yield the original DEK
    const selfRaw = await unwrapKey(
      selfGrant!.wrappedDek,
      selfGrant!.wrappedDekIv,
      selfGrant!.wrappedDekTag,
      result.keys.kek,
    );
    expect(selfRaw).toEqual(projDekRaw);

    // RECOVERY grant must unwrap with the same recovery key the user supplied
    const recoveryRaw = await unwrapKey(
      recoveryGrant!.wrappedDek,
      recoveryGrant!.wrappedDekIv,
      recoveryGrant!.wrappedDekTag,
      result.keys.recoveryKey,
    );
    expect(recoveryRaw).toEqual(projDekRaw);
  });

  it("throws (does NOT post) when no RECOVERY grants exist — we refuse to lock the user into a worse state", async () => {
    const { recoveryFormatted } = await buildVault("old-pw");
    api.recoveryGrantsGet.mockResolvedValueOnce({ data: [], error: null });
    await expect(recoverVaultOps(recoveryFormatted, "new-pw")).rejects.toThrow(
      /No recovery grants/,
    );
    expect(api.recoverPost).not.toHaveBeenCalled();
  });

  it("throws (does NOT post) when data is null (server error / legacy vault)", async () => {
    const { recoveryFormatted } = await buildVault("old-pw");
    api.recoveryGrantsGet.mockResolvedValueOnce({ data: null, error: null });
    await expect(recoverVaultOps(recoveryFormatted, "new-pw")).rejects.toThrow();
    expect(api.recoverPost).not.toHaveBeenCalled();
  });

  it("throws when the recovery key cannot unwrap even one grant (wrong recovery key)", async () => {
    const { kek, recoveryKey } = await buildVault("old-pw");
    const projDek = await generateDEK();
    const wrapped = await wrapKey(await exportDEK(projDek), recoveryKey);

    api.recoveryGrantsGet.mockResolvedValueOnce({
      data: [
        {
          projectId: "p",
          wrappedDek: wrapped.wrapped,
          wrappedDekIv: wrapped.iv,
          wrappedDekTag: wrapped.tag,
        },
      ],
      error: null,
    });

    const wrongRecovery = generateRecoveryKey();
    await expect(recoverVaultOps(wrongRecovery, "new-pw")).rejects.toThrow();
    expect(api.recoverPost).not.toHaveBeenCalled();
    // Avoid: silently POSTing "recovery" with empty grants would wipe the user's DEKs.
  });

  it("returns a vaultInfo whose hash and salt reflect the new password/recovery state", async () => {
    const { kek, recoveryFormatted, recoveryKey, recoveryBytes } = await buildVault("old-pw");
    const projDek = await generateDEK();
    const wrapped = await wrapKey(await exportDEK(projDek), recoveryKey);
    api.recoveryGrantsGet.mockResolvedValueOnce({
      data: [
        {
          projectId: "p",
          wrappedDek: wrapped.wrapped,
          wrappedDekIv: wrapped.iv,
          wrappedDekTag: wrapped.tag,
        },
      ],
      error: null,
    });

    const result = await recoverVaultOps(recoveryFormatted, "new-pw");

    // Hash of the recovery bytes is stable (same recovery key before/after)
    const expectedHash = toBase64(
      await crypto.subtle.digest("SHA-256", recoveryBytes.buffer as ArrayBuffer),
    );
    expect(result.vaultInfo.recoveryKeyHash).toBe(expectedHash);

    // Iterations stay at production value on the new KEK
    expect(result.vaultInfo.kekIterations).toBe(600_000);

    // The returned keys can unwrap the new wrapped recovery key.
    const raw = await unwrapKey(
      result.vaultInfo.wrappedRecoveryKey,
      result.vaultInfo.wrappedRecoveryKeyIv,
      result.vaultInfo.wrappedRecoveryKeyTag,
      result.keys.kek,
    );
    expect(raw).toEqual(recoveryBytes);
  });

  it("private key returned is importable and paired with the posted public key", async () => {
    const { recoveryFormatted, recoveryKey } = await buildVault("old-pw");
    const projDek = await generateDEK();
    const wrapped = await wrapKey(await exportDEK(projDek), recoveryKey);
    api.recoveryGrantsGet.mockResolvedValueOnce({
      data: [
        {
          projectId: "p",
          wrappedDek: wrapped.wrapped,
          wrappedDekIv: wrapped.iv,
          wrappedDekTag: wrapped.tag,
        },
      ],
      error: null,
    });

    const result = await recoverVaultOps(recoveryFormatted, "new-pw");
    expect(result.keys.privateKey).toBeInstanceOf(CryptoKey);

    // The same privateKey can unwrap its own wrapped copy (round-trip with new KEK)
    const rawPriv = await unwrapKey(
      result.vaultInfo.wrappedPrivateKey,
      result.vaultInfo.wrappedPrivateKeyIv,
      result.vaultInfo.wrappedPrivateKeyTag,
      result.keys.kek,
    );
    expect(rawPriv).toBeInstanceOf(Uint8Array);
    expect(rawPriv.length).toBeGreaterThan(0);
  });
});

describe("regenerateRecoveryKeyOps", () => {
  it("rotates the recovery key and re-wraps every existing RECOVERY grant under it", async () => {
    const { kek, recoveryKey } = await buildVault("pw");

    const dekA = await generateDEK();
    const dekB = await generateDEK();
    const wA = await wrapKey(await exportDEK(dekA), recoveryKey);
    const wB = await wrapKey(await exportDEK(dekB), recoveryKey);

    api.recoveryGrantsGet.mockResolvedValueOnce({
      data: [
        { projectId: "a", wrappedDek: wA.wrapped, wrappedDekIv: wA.iv, wrappedDekTag: wA.tag },
        { projectId: "b", wrappedDek: wB.wrapped, wrappedDekIv: wB.iv, wrappedDekTag: wB.tag },
      ],
      error: null,
    });

    const result = await regenerateRecoveryKeyOps(kek, recoveryKey, new Map());

    expect(api.recoveryKeyPut).toHaveBeenCalledTimes(1);
    const body = api.recoveryKeyPut.mock.calls[0]![0] as {
      newRecoveryKeyHash: string;
      newWrappedRecoveryKey: string;
      newWrappedRecoveryKeyIv: string;
      newWrappedRecoveryKeyTag: string;
      updatedGrants: Array<{
        projectId: string;
        wrappedDek: string;
        wrappedDekIv: string;
        wrappedDekTag: string;
      }>;
    };
    expect(body.updatedGrants.map((g) => g.projectId).sort()).toEqual(["a", "b"]);

    // The old recovery key must NOT be able to unwrap the new grants
    for (const g of body.updatedGrants) {
      await expect(
        unwrapKey(g.wrappedDek, g.wrappedDekIv, g.wrappedDekTag, recoveryKey),
      ).rejects.toThrow();
      // The new recovery key must unwrap to the original DEK bytes
      const raw = await unwrapKey(
        g.wrappedDek,
        g.wrappedDekIv,
        g.wrappedDekTag,
        result.recoveryKeyCryptoKey,
      );
      const expected = g.projectId === "a" ? await exportDEK(dekA) : await exportDEK(dekB);
      expect(raw).toEqual(expected);
    }

    // New recovery hash corresponds to the new recovery bytes
    const newBytes = recoveryKeyToBytes(result.recoveryKey);
    const expectedHash = toBase64(
      await crypto.subtle.digest("SHA-256", newBytes.buffer as ArrayBuffer),
    );
    expect(body.newRecoveryKeyHash).toBe(expectedHash);

    // The new wrapped recovery key must unwrap under the current KEK (so password-change still works)
    const rawRec = await unwrapKey(
      body.newWrappedRecoveryKey,
      body.newWrappedRecoveryKeyIv,
      body.newWrappedRecoveryKeyTag,
      kek,
    );
    expect(rawRec).toEqual(newBytes);
  });

  it("merges cache DEKs with server-side RECOVERY grants (no project is left behind)", async () => {
    const { kek, recoveryKey } = await buildVault("pw");

    const cacheDek = await generateDEK();
    const serverDek = await generateDEK();
    const serverWrapped = await wrapKey(await exportDEK(serverDek), recoveryKey);

    api.recoveryGrantsGet.mockResolvedValueOnce({
      data: [
        {
          projectId: "server-only",
          wrappedDek: serverWrapped.wrapped,
          wrappedDekIv: serverWrapped.iv,
          wrappedDekTag: serverWrapped.tag,
        },
      ],
      error: null,
    });

    const result = await regenerateRecoveryKeyOps(
      kek,
      recoveryKey,
      new Map([["cache-only", cacheDek]]),
    );

    const body = api.recoveryKeyPut.mock.calls[0]![0] as {
      updatedGrants: Array<{
        projectId: string;
        wrappedDek: string;
        wrappedDekIv: string;
        wrappedDekTag: string;
      }>;
    };
    expect(new Set(body.updatedGrants.map((g) => g.projectId))).toEqual(
      new Set(["server-only", "cache-only"]),
    );

    const cacheEntry = body.updatedGrants.find((g) => g.projectId === "cache-only")!;
    const rawCached = await unwrapKey(
      cacheEntry.wrappedDek,
      cacheEntry.wrappedDekIv,
      cacheEntry.wrappedDekTag,
      result.recoveryKeyCryptoKey,
    );
    expect(rawCached).toEqual(await exportDEK(cacheDek));
  });

  it("does not double-process a project present in both cache and server grants", async () => {
    const { kek, recoveryKey } = await buildVault("pw");
    const dek = await generateDEK();
    const wrapped = await wrapKey(await exportDEK(dek), recoveryKey);
    api.recoveryGrantsGet.mockResolvedValueOnce({
      data: [
        {
          projectId: "p",
          wrappedDek: wrapped.wrapped,
          wrappedDekIv: wrapped.iv,
          wrappedDekTag: wrapped.tag,
        },
      ],
      error: null,
    });

    await regenerateRecoveryKeyOps(kek, recoveryKey, new Map([["p", dek]]));
    const body = api.recoveryKeyPut.mock.calls[0]![0] as {
      updatedGrants: Array<{ projectId: string }>;
    };
    expect(body.updatedGrants.filter((g) => g.projectId === "p").length).toBe(1);
  });

  it("returned formatted recovery key parses back to 32 raw bytes (AES-256 key material)", async () => {
    const { kek, recoveryKey } = await buildVault("pw");
    const result = await regenerateRecoveryKeyOps(kek, recoveryKey, new Map());
    expect(recoveryKeyToBytes(result.recoveryKey).length).toBe(32);
  });

  it("two sequential regenerations produce distinct recovery keys (never reuse)", async () => {
    const { kek, recoveryKey } = await buildVault("pw");
    const r1 = await regenerateRecoveryKeyOps(kek, recoveryKey, new Map());
    const r2 = await regenerateRecoveryKeyOps(kek, r1.recoveryKeyCryptoKey, new Map());
    expect(r1.recoveryKey).not.toBe(r2.recoveryKey);
  });

  it("multi-project: every RECOVERY grant in a large batch is re-wrapped and isolated from the others", async () => {
    // If a bug cross-contaminated DEKs across projects during batch re-wrap (e.g. off-by-one
    // in the loop), a decrypt of project A would silently return project B's DEK and all of
    // A's secrets become corrupted after the next write. Guard with an explicit per-project
    // unwrap + equality check.
    const { kek, recoveryKey } = await buildVault("pw");

    const ids = ["p1", "p2", "p3", "p4", "p5"];
    const cache = new Map<string, CryptoKey>();
    const expectedRaw = new Map<string, Uint8Array>();
    for (const id of ids) {
      const d = await generateDEK();
      cache.set(id, d);
      expectedRaw.set(id, await exportDEK(d));
    }
    api.recoveryGrantsGet.mockResolvedValueOnce({ data: [], error: null });

    const result = await regenerateRecoveryKeyOps(kek, recoveryKey, cache);
    const body = api.recoveryKeyPut.mock.calls[0]![0] as {
      updatedGrants: Array<{
        projectId: string;
        wrappedDek: string;
        wrappedDekIv: string;
        wrappedDekTag: string;
      }>;
    };

    expect(body.updatedGrants.map((g) => g.projectId).sort()).toEqual(ids.slice().sort());
    for (const g of body.updatedGrants) {
      const raw = await unwrapKey(
        g.wrappedDek,
        g.wrappedDekIv,
        g.wrappedDekTag,
        result.recoveryKeyCryptoKey,
      );
      // Exact project-to-DEK mapping preserved
      expect(raw).toEqual(expectedRaw.get(g.projectId));
    }
  });
});
