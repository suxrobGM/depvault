import {
  deriveKEK,
  deriveSharedKey,
  exportDEK,
  generateDEK,
  generateKeyPair,
  generateRecoveryKey,
  generateSalt,
  importDEK,
  importPrivateKey,
  importRecoveryKey,
  recoveryKeyToBytes,
  unwrapKey,
  wrapKey,
} from "@depvault/crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KeyGrantMismatchError, KeyGrantMissingError } from "./errors";
import {
  createProjectECDHGrant,
  createProjectRecoveryGrant,
  createProjectSelfGrant,
  resolveProjectDEK,
} from "./vault-grants";

/**
 * The mocked API layer. Each endpoint is a vi.fn — tests call .mockResolvedValueOnce to
 * simulate server responses. The structure mirrors `client.api.…` access paths in the
 * vault-grants module. Tests never spin up a real HTTP client.
 */
const { api } = vi.hoisted(() => {
  const myGet = vi.fn();
  const postGrant = vi.fn();
  return {
    api: {
      myGet,
      postGrant,
      projectsFactory: (id: string) => ({
        keygrants: {
          my: { get: () => myGet(id) },
          post: (body: unknown) => postGrant(id, body),
        },
      }),
    },
  };
});

vi.mock("@/lib/api", () => ({
  client: {
    api: {
      projects: (args: { id: string }) => api.projectsFactory(args.id),
    },
  },
}));

const FAST_ITERATIONS = 1000;

async function freshKek(password = "pw") {
  const salt = generateSalt();
  return deriveKEK(password, salt, FAST_ITERATIONS);
}

beforeEach(() => {
  api.myGet.mockReset();
  api.postGrant.mockReset();
  api.postGrant.mockResolvedValue({ data: { ok: true }, error: null });
});

describe("resolveProjectDEK — SELF grant path", () => {
  it("unwraps a SELF grant using the KEK and returns a usable DEK", async () => {
    const kek = await freshKek();
    const dek = await generateDEK();
    const dekRaw = await exportDEK(dek);
    const wrapped = await wrapKey(dekRaw, kek);

    api.myGet.mockResolvedValueOnce({
      data: {
        grantType: "SELF",
        wrappedDek: wrapped.wrapped,
        wrappedDekIv: wrapped.iv,
        wrappedDekTag: wrapped.tag,
      },
      error: null,
    });

    const resolved = await resolveProjectDEK("proj-1", kek, null);
    expect(resolved).toBeInstanceOf(CryptoKey);
    // Round-trip: the resolved DEK must equal the original DEK bytes.
    const roundTrip = await exportDEK(resolved);
    expect(roundTrip).toEqual(dekRaw);
  });

  it("throws KeyGrantMismatchError when unwrap fails due to wrong KEK (wrong password scenario)", async () => {
    const kekA = await freshKek("alice-pw");
    const kekB = await freshKek("bob-pw");
    const dek = await generateDEK();
    const dekRaw = await exportDEK(dek);
    const wrapped = await wrapKey(dekRaw, kekA);

    api.myGet.mockResolvedValueOnce({
      data: {
        grantType: "SELF",
        wrappedDek: wrapped.wrapped,
        wrappedDekIv: wrapped.iv,
        wrappedDekTag: wrapped.tag,
      },
      error: null,
    });

    await expect(resolveProjectDEK("proj-1", kekB, null)).rejects.toBeInstanceOf(
      KeyGrantMismatchError,
    );
  });

  it("preserves the original unwrap error as `cause` on the mismatch error", async () => {
    const kekA = await freshKek("a");
    const kekB = await freshKek("b");
    const dek = await generateDEK();
    const wrapped = await wrapKey(await exportDEK(dek), kekA);
    api.myGet.mockResolvedValueOnce({
      data: {
        grantType: "SELF",
        wrappedDek: wrapped.wrapped,
        wrappedDekIv: wrapped.iv,
        wrappedDekTag: wrapped.tag,
      },
      error: null,
    });

    try {
      await resolveProjectDEK("proj-1", kekB, null);
      expect.fail("expected to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(KeyGrantMismatchError);
      expect((err as KeyGrantMismatchError).cause).toBeDefined();
    }
  });
});

describe("resolveProjectDEK — ECDH grant path", () => {
  it("derives shared key from recipient private key + granter public key and unwraps the DEK", async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();
    const alicePriv = await importPrivateKey(alice.privateKeyRaw);
    const bobPriv = await importPrivateKey(bob.privateKeyRaw);

    // Alice (granter) wraps the DEK with the shared key
    const shared = await deriveSharedKey(alicePriv, bob.publicKey);
    const dek = await generateDEK();
    const dekRaw = await exportDEK(dek);
    const wrapped = await wrapKey(dekRaw, shared);

    api.myGet.mockResolvedValueOnce({
      data: {
        grantType: "ECDH",
        granterPublicKey: alice.publicKey,
        wrappedDek: wrapped.wrapped,
        wrappedDekIv: wrapped.iv,
        wrappedDekTag: wrapped.tag,
      },
      error: null,
    });

    // Bob (recipient) unwraps with his private key + alice's public key
    const resolved = await resolveProjectDEK("proj-1", await freshKek(), bobPriv);
    expect(await exportDEK(resolved)).toEqual(dekRaw);
  });

  it("throws when ECDH grant is received but the private key is null", async () => {
    const alice = await generateKeyPair();
    api.myGet.mockResolvedValueOnce({
      data: {
        grantType: "ECDH",
        granterPublicKey: alice.publicKey,
        wrappedDek: "AAAA",
        wrappedDekIv: "AAAA",
        wrappedDekTag: "AAAA",
      },
      error: null,
    });

    // "Private key not available" throws under the try — surfaces as KeyGrantMismatchError
    await expect(resolveProjectDEK("p", await freshKek(), null)).rejects.toThrow();
  });

  it("throws KeyGrantMismatchError when ECDH unwrap fails (granter rotated key)", async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();
    const mallory = await generateKeyPair(); // a different key pair than the one used to wrap
    const alicePriv = await importPrivateKey(alice.privateKeyRaw);
    const bobPriv = await importPrivateKey(bob.privateKeyRaw);

    const shared = await deriveSharedKey(alicePriv, bob.publicKey);
    const dek = await generateDEK();
    const wrapped = await wrapKey(await exportDEK(dek), shared);

    api.myGet.mockResolvedValueOnce({
      data: {
        grantType: "ECDH",
        granterPublicKey: mallory.publicKey, // mismatched granter key
        wrappedDek: wrapped.wrapped,
        wrappedDekIv: wrapped.iv,
        wrappedDekTag: wrapped.tag,
      },
      error: null,
    });

    await expect(resolveProjectDEK("p", await freshKek(), bobPriv)).rejects.toBeInstanceOf(
      KeyGrantMismatchError,
    );
  });
});

describe("resolveProjectDEK — error paths", () => {
  it("throws KeyGrantMissingError when server returns 404", async () => {
    api.myGet.mockResolvedValueOnce({
      data: null,
      error: { status: 404, value: "not found" },
    });

    await expect(resolveProjectDEK("proj-x", await freshKek(), null)).rejects.toBeInstanceOf(
      KeyGrantMissingError,
    );
  });

  it("throws a non-typed error for any non-404 HTTP error — never swallow", async () => {
    api.myGet.mockResolvedValueOnce({
      data: null,
      error: { status: 500, value: "boom" },
    });

    await expect(resolveProjectDEK("p", await freshKek(), null)).rejects.toThrow(
      /Failed to fetch key grant/,
    );
  });

  it("throws KeyGrantMissingError when grant data is nullish with no error", async () => {
    // Defensive: server shouldn't do this, but if it does, treat as missing — not mismatch.
    api.myGet.mockResolvedValueOnce({ data: null, error: null });

    await expect(resolveProjectDEK("p", await freshKek(), null)).rejects.toBeInstanceOf(
      KeyGrantMissingError,
    );
  });

  it("throws for an unsupported grantType instead of silently falling through", async () => {
    api.myGet.mockResolvedValueOnce({
      data: {
        grantType: "MYSTERY",
        wrappedDek: "AAAA",
        wrappedDekIv: "AAAA",
        wrappedDekTag: "AAAA",
      },
      error: null,
    });

    await expect(resolveProjectDEK("p", await freshKek(), null)).rejects.toThrow();
  });

  it("RECOVERY grants are NOT resolvable via resolveProjectDEK (they live on a different endpoint)", async () => {
    // The resolver is only called with the user-facing grant (SELF/ECDH). RECOVERY grants
    // would indicate a server bug or manual DB manipulation — we must not treat them as usable.
    api.myGet.mockResolvedValueOnce({
      data: {
        grantType: "RECOVERY",
        wrappedDek: "AAAA",
        wrappedDekIv: "AAAA",
        wrappedDekTag: "AAAA",
      },
      error: null,
    });

    await expect(resolveProjectDEK("p", await freshKek(), null)).rejects.toThrow();
  });
});

describe("createProjectSelfGrant", () => {
  it("sends a SELF grant with correctly wrapped DEK and returns a usable DEK", async () => {
    const kek = await freshKek();
    const dek = await createProjectSelfGrant("proj-1", "user-1", kek);

    // API must have been called with SELF grantType and non-empty wrapped bytes
    expect(api.postGrant).toHaveBeenCalledTimes(1);
    const [projectId, body] = api.postGrant.mock.calls[0] as [
      string,
      {
        grantType: string;
        userId: string;
        wrappedDek: string;
        wrappedDekIv: string;
        wrappedDekTag: string;
      },
    ];
    expect(projectId).toBe("proj-1");
    expect(body.grantType).toBe("SELF");
    expect(body.userId).toBe("user-1");
    expect(body.wrappedDek.length).toBeGreaterThan(0);
    expect(body.wrappedDekIv.length).toBeGreaterThan(0);
    expect(body.wrappedDekTag.length).toBeGreaterThan(0);

    // The returned DEK must match the one wrapped in the body
    const raw = await unwrapKey(body.wrappedDek, body.wrappedDekIv, body.wrappedDekTag, kek);
    expect(raw).toEqual(await exportDEK(dek));
  });

  it("produces unique DEKs across calls (no accidental key reuse between projects)", async () => {
    const kek = await freshKek();
    const dek1 = await createProjectSelfGrant("proj-1", "u", kek);
    const dek2 = await createProjectSelfGrant("proj-2", "u", kek);
    expect(await exportDEK(dek1)).not.toEqual(await exportDEK(dek2));
  });

  it("uses fresh IV and wrapping ciphertext per call (GCM-safe)", async () => {
    const kek = await freshKek();
    await createProjectSelfGrant("p", "u", kek);
    await createProjectSelfGrant("p", "u", kek);
    const b1 = api.postGrant.mock.calls[0]![1] as { wrappedDekIv: string; wrappedDek: string };
    const b2 = api.postGrant.mock.calls[1]![1] as { wrappedDekIv: string; wrappedDek: string };
    expect(b1.wrappedDekIv).not.toBe(b2.wrappedDekIv);
    expect(b1.wrappedDek).not.toBe(b2.wrappedDek);
  });
});

describe("createProjectRecoveryGrant", () => {
  it("wraps DEK with the recovery key (and NOT the KEK — different unwrap key at recovery time)", async () => {
    const recoveryKey = await importRecoveryKey(recoveryKeyToBytes(generateRecoveryKey()));
    const dek = await generateDEK();
    const dekRaw = await exportDEK(dek);
    await createProjectRecoveryGrant("p", "u", dek, recoveryKey);

    expect(api.postGrant).toHaveBeenCalledTimes(1);
    const body = api.postGrant.mock.calls[0]![1] as {
      grantType: string;
      wrappedDek: string;
      wrappedDekIv: string;
      wrappedDekTag: string;
    };
    expect(body.grantType).toBe("RECOVERY");

    // Can be unwrapped only with the recovery key — not with a random KEK
    const decoded = await unwrapKey(
      body.wrappedDek,
      body.wrappedDekIv,
      body.wrappedDekTag,
      recoveryKey,
    );
    expect(decoded).toEqual(dekRaw);

    const otherKek = await freshKek();
    await expect(
      unwrapKey(body.wrappedDek, body.wrappedDekIv, body.wrappedDekTag, otherKek),
    ).rejects.toThrow();
  });
});

describe("createProjectECDHGrant", () => {
  it("wraps with ECDH shared key and posts granterPublicKey so the recipient can derive the shared key", async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();
    const alicePriv = await importPrivateKey(alice.privateKeyRaw);

    const dek = await generateDEK();
    const dekRaw = await exportDEK(dek);

    await createProjectECDHGrant("p", "bob-id", bob.publicKey, dek, alicePriv, alice.publicKey);

    expect(api.postGrant).toHaveBeenCalledTimes(1);
    const body = api.postGrant.mock.calls[0]![1] as {
      grantType: string;
      userId: string;
      granterPublicKey: string;
      wrappedDek: string;
      wrappedDekIv: string;
      wrappedDekTag: string;
    };
    expect(body.grantType).toBe("ECDH");
    expect(body.userId).toBe("bob-id");
    expect(body.granterPublicKey).toBe(alice.publicKey);

    // Bob can unwrap with his own private key + alice's granter public key
    const bobPriv = await importPrivateKey(bob.privateKeyRaw);
    const shared = await deriveSharedKey(bobPriv, alice.publicKey);
    const unwrapped = await unwrapKey(
      body.wrappedDek,
      body.wrappedDekIv,
      body.wrappedDekTag,
      shared,
    );
    expect(unwrapped).toEqual(dekRaw);

    // A third party with their own key pair cannot derive the shared key
    const eve = await generateKeyPair();
    const evePriv = await importPrivateKey(eve.privateKeyRaw);
    const eveShared = await deriveSharedKey(evePriv, alice.publicKey);
    await expect(
      unwrapKey(body.wrappedDek, body.wrappedDekIv, body.wrappedDekTag, eveShared),
    ).rejects.toThrow();
  });

  it("the DEK is wrapped — never transmitted in plaintext", async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();
    const alicePriv = await importPrivateKey(alice.privateKeyRaw);

    const dek = await generateDEK();
    const dekRaw = await exportDEK(dek);

    await createProjectECDHGrant("p", "bob-id", bob.publicKey, dek, alicePriv, alice.publicKey);
    const body = api.postGrant.mock.calls[0]![1] as { wrappedDek: string };

    // The plaintext DEK bytes must not appear verbatim in the wrapped payload
    const rawB64 = Buffer.from(dekRaw).toString("base64");
    expect(body.wrappedDek).not.toBe(rawB64);
  });

  it("importDEK of the resolved bytes returns a CryptoKey that decrypts data encrypted by the granter", async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();
    const alicePriv = await importPrivateKey(alice.privateKeyRaw);
    const bobPriv = await importPrivateKey(bob.privateKeyRaw);

    const dek = await generateDEK();
    await createProjectECDHGrant("p", "bob-id", bob.publicKey, dek, alicePriv, alice.publicKey);

    // Alice encrypts something with the DEK
    const { encrypt } = await import("@depvault/crypto");
    const encrypted = await encrypt("hello from alice", dek);

    // Bob recovers the DEK from his grant
    const body = api.postGrant.mock.calls[0]![1] as {
      wrappedDek: string;
      wrappedDekIv: string;
      wrappedDekTag: string;
    };
    const shared = await deriveSharedKey(bobPriv, alice.publicKey);
    const bobDek = await importDEK(
      await unwrapKey(body.wrappedDek, body.wrappedDekIv, body.wrappedDekTag, shared),
    );
    const { decrypt } = await import("@depvault/crypto");
    expect(await decrypt(encrypted.ciphertext, encrypted.iv, encrypted.authTag, bobDek)).toBe(
      "hello from alice",
    );
  });
});
