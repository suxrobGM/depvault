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
import { useIdleLock } from "@/hooks/use-idle-lock";
import {
  changeVaultPasswordOps,
  createProjectECDHGrant,
  createProjectSelfGrant,
  createVault,
  fetchVaultInfo,
  resolveProjectDEK,
  unlockVaultKeys,
  type VaultInfo,
} from "@/lib/crypto/vault-operations";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

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

  const [vaultStatus, setVaultStatus] = useState<VaultStatus>(user ? "loading" : "no-vault");
  const kekRef = useRef<CryptoKey | null>(null);
  const privateKeyRef = useRef<CryptoKey | null>(null);
  const dekCacheRef = useRef<Map<string, CryptoKey>>(new Map());
  const vaultInfoRef = useRef<VaultInfo | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    fetchVaultInfo()
      .then((info) => {
        if (cancelled) return;
        if (info) {
          vaultInfoRef.current = info;
          setVaultStatus("locked");
        } else {
          setVaultStatus("no-vault");
        }
      })
      .catch(() => {
        if (!cancelled) setVaultStatus("no-vault");
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const lockVault = () => {
    kekRef.current = null;
    privateKeyRef.current = null;
    dekCacheRef.current.clear();
    setVaultStatus("locked");
  };

  useIdleLock(vaultStatus === "unlocked", IDLE_TIMEOUT_MS, lockVault);

  const unlockVault = async (password: string) => {
    if (!vaultInfoRef.current) throw new Error("Vault info not loaded");

    const keys = await unlockVaultKeys(password, vaultInfoRef.current);
    kekRef.current = keys.kek;
    privateKeyRef.current = keys.privateKey;
    setVaultStatus("unlocked");
  };

  const setupVault = async (password: string) => {
    const result = await createVault(password);
    kekRef.current = result.keys.kek;
    privateKeyRef.current = result.keys.privateKey;
    vaultInfoRef.current = result.vaultInfo;
    setVaultStatus("unlocked");
    return { recoveryKey: result.recoveryKey };
  };

  const getProjectDEK = async (projectId: string): Promise<CryptoKey> => {
    const cached = dekCacheRef.current.get(projectId);
    if (cached) return cached;

    if (!kekRef.current) throw new Error("Vault is locked");

    const dek = await resolveProjectDEK(projectId, kekRef.current, privateKeyRef.current);

    if (!dek) {
      // No key grant exists — auto-initialize for pre-existing projects
      const newDek = await createProjectSelfGrant(projectId, user!.id, kekRef.current);
      dekCacheRef.current.set(projectId, newDek);
      return newDek;
    }

    dekCacheRef.current.set(projectId, dek);
    return dek;
  };

  const initializeProjectKeys = async (projectId: string) => {
    if (!kekRef.current) throw new Error("Vault must be unlocked to initialize project keys");

    const dek = await createProjectSelfGrant(projectId, user!.id, kekRef.current);
    dekCacheRef.current.set(projectId, dek);
  };

  const grantProjectKeyToMember = async (
    projectId: string,
    recipientUserId: string,
    recipientPublicKey: string,
  ) => {
    if (!privateKeyRef.current) throw new Error("Vault must be unlocked to grant keys");
    if (!vaultInfoRef.current) throw new Error("Vault info not loaded");

    const dek = await getProjectDEK(projectId);
    await createProjectECDHGrant(
      projectId,
      recipientUserId,
      recipientPublicKey,
      dek,
      privateKeyRef.current,
      vaultInfoRef.current.publicKey,
    );
  };

  const changeVaultPassword = async (_oldPassword: string, newPassword: string) => {
    if (!privateKeyRef.current) throw new Error("Vault must be unlocked to change password");
    if (!vaultInfoRef.current) throw new Error("Vault info not loaded");

    const result = await changeVaultPasswordOps(
      newPassword,
      privateKeyRef.current,
      dekCacheRef.current,
    );

    kekRef.current = result.kek;
    vaultInfoRef.current = {
      ...vaultInfoRef.current,
      kekSalt: result.kekSalt,
      kekIterations: result.kekIterations,
      wrappedPrivateKey: result.wrappedPrivateKey,
      wrappedPrivateKeyIv: result.wrappedPrivateKeyIv,
      wrappedPrivateKeyTag: result.wrappedPrivateKeyTag,
    };
  };

  const recoverVault = async (_recoveryKey: string, _newPassword: string) => {
    // TODO: implement recovery flow
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
