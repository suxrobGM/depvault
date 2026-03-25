"use client";

import {
  createContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactElement,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import { client } from "@/lib/api";
import {
  deriveKEK,
  deriveSharedKey,
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
} from "@/lib/crypto";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export type VaultStatus = "loading" | "no-vault" | "locked" | "unlocked";

/** Client-side vault state and cryptographic operations for end-to-end encryption. */
export interface VaultContextValue {
  isVaultSetup: boolean;
  isVaultUnlocked: boolean;
  vaultStatus: VaultStatus;
  /** Derive KEK from password, unwrap private key, and transition to unlocked state. */
  unlockVault: (password: string) => Promise<void>;
  /** Clear all in-memory keys and revert to locked state. */
  lockVault: () => void;
  /** Create a new vault with keypair, KEK, and recovery key. */
  setupVault: (password: string) => Promise<{ recoveryKey: string }>;
  /** Retrieve (and cache) the project's data encryption key via the user's key grant. */
  getProjectDEK: (projectId: string) => Promise<CryptoKey>;
  /** Generate a DEK for a new project and create a SELF key grant. */
  initializeProjectKeys: (projectId: string) => Promise<void>;
  /** Wrap the project DEK with an ECDH shared key and create a grant for a team member. */
  grantProjectKeyToMember: (
    projectId: string,
    recipientUserId: string,
    recipientPublicKey: string,
  ) => Promise<void>;
  /** Re-wrap the private key and all cached DEKs with a new KEK derived from the new password. */
  changeVaultPassword: (oldPassword: string, newPassword: string) => Promise<void>;
  /** Restore vault access using a recovery key and set a new password. */
  recoverVault: (recoveryKey: string, newPassword: string) => Promise<void>;
}

export const VaultContext = createContext<VaultContextValue | null>(null);

/** Manages vault lifecycle, in-memory keys, and idle-timeout auto-lock. */
export function VaultProvider(props: PropsWithChildren): ReactElement {
  const { children } = props;
  const { user } = useAuth();

  const initialStatus: VaultStatus = user ? "loading" : "no-vault";
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>(initialStatus);
  const kekRef = useRef<CryptoKey | null>(null);
  const privateKeyRef = useRef<CryptoKey | null>(null);
  const dekCacheRef = useRef<Map<string, CryptoKey>>(new Map());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vaultInfoRef = useRef<{ kekSalt: string; kekIterations: number; publicKey: string } | null>(
    null,
  );

  // Check vault status on mount
  useEffect(() => {
    if (!user) return;

    client.api.vault.status.get().then(({ data }) => {
      if (!data) {
        setVaultStatus("no-vault");
        return;
      }

      if (data.hasVault) {
        vaultInfoRef.current = {
          kekSalt: data.kekSalt!,
          kekIterations: data.kekIterations!,
          publicKey: data.publicKey!,
        };
        setVaultStatus("locked");
      } else {
        setVaultStatus("no-vault");
      }
    });
  }, [user]);

  const lockVault = () => {
    kekRef.current = null;
    privateKeyRef.current = null;
    dekCacheRef.current.clear();
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setVaultStatus("locked");
  };

  // Track user activity to reset idle timer
  useEffect(() => {
    if (vaultStatus !== "unlocked") return;

    const doLock = () => {
      kekRef.current = null;
      privateKeyRef.current = null;
      dekCacheRef.current.clear();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      setVaultStatus("locked");
    };

    const resetTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(doLock, IDLE_TIMEOUT_MS);
    };

    const events = ["mousedown", "keydown", "touchstart", "scroll"] as const;
    for (const event of events) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    resetTimer();

    return () => {
      for (const event of events) {
        window.removeEventListener(event, resetTimer);
      }
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [vaultStatus]);

  const unlockVault = async (password: string) => {
    if (!vaultInfoRef.current) {
      throw new Error("Vault info not loaded");
    }

    const { kekSalt, kekIterations } = vaultInfoRef.current;
    const salt = fromBase64(kekSalt);
    const kek = await deriveKEK(password, salt, kekIterations);

    // Fetch wrapped private key and unwrap it to verify the password
    const { data: status } = await client.api.vault.status.get();
    if (
      !status?.hasVault ||
      !status.wrappedPrivateKey ||
      !status.wrappedPrivateKeyIv ||
      !status.wrappedPrivateKeyTag
    ) {
      throw new Error("Vault not found");
    }

    try {
      const privateKeyRaw = await unwrapKey(
        status.wrappedPrivateKey,
        status.wrappedPrivateKeyIv,
        status.wrappedPrivateKeyTag,
        kek,
      );
      privateKeyRef.current = await importPrivateKey(privateKeyRaw);
    } catch {
      throw new Error("Incorrect vault password");
    }

    kekRef.current = kek;
    setVaultStatus("unlocked");
  };

  const setupVault = async (password: string) => {
    const salt = generateSalt();
    const kek = await deriveKEK(password, salt);

    // Generate ECDH keypair
    const keyPair = await generateKeyPair();

    // Wrap private key with KEK
    const wrappedPrivate = await wrapKey(keyPair.privateKeyRaw, kek);

    // Generate recovery key
    const recoveryKeyFormatted = generateRecoveryKey();
    const recoveryBytes = recoveryKeyToBytes(recoveryKeyFormatted);
    const recoveryHash = toBase64(
      await crypto.subtle.digest("SHA-256", recoveryBytes.buffer as ArrayBuffer),
    );

    await client.api.vault.setup.post({
      kekSalt: toBase64(salt.buffer as ArrayBuffer),
      kekIterations: 600_000,
      publicKey: keyPair.publicKey,
      wrappedPrivateKey: wrappedPrivate.wrapped,
      wrappedPrivateKeyIv: wrappedPrivate.iv,
      wrappedPrivateKeyTag: wrappedPrivate.tag,
      recoveryKeyHash: recoveryHash,
    });

    // Set local state
    kekRef.current = kek;
    privateKeyRef.current = await importPrivateKey(keyPair.privateKeyRaw);
    vaultInfoRef.current = {
      kekSalt: toBase64(salt.buffer as ArrayBuffer),
      kekIterations: 600_000,
      publicKey: keyPair.publicKey,
    };

    setVaultStatus("unlocked");

    return { recoveryKey: recoveryKeyFormatted };
  };

  const getProjectDEK = async (projectId: string): Promise<CryptoKey> => {
    const cached = dekCacheRef.current.get(projectId);
    if (cached) return cached;

    if (!kekRef.current) {
      throw new Error("Vault is locked");
    }

    const { data: grant, error } = await client.api
      .projects({ id: projectId })
      ["key-grants"].mine.get();

    if (!grant || error) {
      // No key grant exists — auto-initialize keys for this project (handles pre-existing projects)
      await initializeProjectKeys(projectId);
      return dekCacheRef.current.get(projectId)!;
    }

    let dekRaw: Uint8Array;

    if (grant.grantType === "SELF") {
      // Unwrap with KEK directly
      dekRaw = await unwrapKey(
        grant.wrappedDek,
        grant.wrappedDekIv,
        grant.wrappedDekTag,
        kekRef.current,
      );
    } else if (grant.grantType === "ECDH" && grant.granterPublicKey) {
      // Derive shared key from ECDH, then unwrap
      if (!privateKeyRef.current) {
        throw new Error("Private key not available");
      }
      const sharedKey = await deriveSharedKey(privateKeyRef.current, grant.granterPublicKey);
      dekRaw = await unwrapKey(
        grant.wrappedDek,
        grant.wrappedDekIv,
        grant.wrappedDekTag,
        sharedKey,
      );
    } else {
      throw new Error(`Unsupported grant type: ${grant.grantType}`);
    }

    const dek = await importDEK(dekRaw);
    dekCacheRef.current.set(projectId, dek);
    return dek;
  };

  /** Generate a DEK for a new project, wrap it with the user's KEK, and create a SELF key grant. */
  const initializeProjectKeys = async (projectId: string) => {
    if (!kekRef.current) {
      throw new Error("Vault must be unlocked to initialize project keys");
    }

    const dek = await generateDEK();
    const dekRaw = await exportDEK(dek);
    const wrapped = await wrapKey(dekRaw, kekRef.current);

    const { data: status } = await client.api.vault.status.get();
    if (!status?.hasVault) throw new Error("Vault not found");

    await client.api.projects({ id: projectId })["key-grants"].post({
      userId: user!.id,
      wrappedDek: wrapped.wrapped,
      wrappedDekIv: wrapped.iv,
      wrappedDekTag: wrapped.tag,
      grantType: "SELF",
    });

    dekCacheRef.current.set(projectId, dek);
  };

  /** Wrap the project DEK with an ECDH shared key and create a grant for a team member. */
  const grantProjectKeyToMember = async (
    projectId: string,
    recipientUserId: string,
    recipientPublicKey: string,
  ) => {
    if (!privateKeyRef.current) {
      throw new Error("Vault must be unlocked to grant keys");
    }
    if (!vaultInfoRef.current) {
      throw new Error("Vault info not loaded");
    }

    const dek = await getProjectDEK(projectId);
    const dekRaw = await exportDEK(dek);
    const sharedKey = await deriveSharedKey(privateKeyRef.current, recipientPublicKey);
    const wrapped = await wrapKey(dekRaw, sharedKey);

    await client.api.projects({ id: projectId })["key-grants"].post({
      userId: recipientUserId,
      wrappedDek: wrapped.wrapped,
      wrappedDekIv: wrapped.iv,
      wrappedDekTag: wrapped.tag,
      granterPublicKey: vaultInfoRef.current.publicKey,
      grantType: "ECDH",
    });
  };

  const changeVaultPassword = async (oldPassword: string, newPassword: string) => {
    if (!vaultInfoRef.current) throw new Error("Vault info not loaded");

    const oldSalt = fromBase64(vaultInfoRef.current.kekSalt);
    const oldKek = await deriveKEK(oldPassword, oldSalt, vaultInfoRef.current.kekIterations);

    const newSalt = generateSalt();
    const newKek = await deriveKEK(newPassword, newSalt);

    // Re-wrap private key with new KEK
    // First we need the raw private key — unwrap with old KEK
    // For now, we assume privateKeyRef is populated
    if (!privateKeyRef.current) {
      throw new Error("Vault must be unlocked to change password");
    }

    const privateKeyRaw = new Uint8Array(
      await crypto.subtle.exportKey("pkcs8", privateKeyRef.current),
    );
    const newWrappedPrivate = await wrapKey(privateKeyRaw, newKek);

    // Re-wrap all project DEKs with new KEK
    const updatedGrants: Array<{
      projectId: string;
      wrappedDek: string;
      wrappedDekIv: string;
      wrappedDekTag: string;
    }> = [];

    for (const [projectId, dek] of dekCacheRef.current.entries()) {
      const dekRaw = await exportDEK(dek);
      const wrapped = await wrapKey(dekRaw, newKek);
      updatedGrants.push({
        projectId,
        wrappedDek: wrapped.wrapped,
        wrappedDekIv: wrapped.iv,
        wrappedDekTag: wrapped.tag,
      });
    }

    await client.api.vault.password.put({
      newKekSalt: toBase64(newSalt.buffer as ArrayBuffer),
      newKekIterations: 600_000,
      newWrappedPrivateKey: newWrappedPrivate.wrapped,
      newWrappedPrivateKeyIv: newWrappedPrivate.iv,
      newWrappedPrivateKeyTag: newWrappedPrivate.tag,
      updatedGrants,
    });

    kekRef.current = newKek;
    vaultInfoRef.current = {
      ...vaultInfoRef.current,
      kekSalt: toBase64(newSalt.buffer as ArrayBuffer),
      kekIterations: 600_000,
    };
  };

  const recoverVault = async (recoveryKeyFormatted: string, newPassword: string) => {
    // TODO: implement recovery flow
    // 1. Fetch all RECOVERY grants
    // 2. Unwrap DEKs with recovery key
    // 3. Generate new keypair, wrap with new KEK
    // 4. Re-wrap DEKs with new KEK, POST to backend
    throw new Error("Recovery not yet implemented");
  };

  const value: VaultContextValue = {
    isVaultSetup: vaultStatus !== "no-vault" && vaultStatus !== "loading",
    isVaultUnlocked: vaultStatus === "unlocked",
    vaultStatus,
    unlockVault,
    lockVault,
    setupVault,
    getProjectDEK,
    initializeProjectKeys,
    grantProjectKeyToMember,
    changeVaultPassword,
    recoverVault,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}
