/**
 * IndexedDB-backed persistence of unlocked vault key material, so a browser refresh (or restart
 * within the trust window) does not force a vault-password re-entry.
 *
 * Only non-extractable CryptoKey objects are stored, and they are stored as CryptoKey objects
 * directly (structured clone preserves non-extractability) — the raw key bytes never become
 * readable to JavaScript, so this is the only browser store that can hold key material safely.
 * Persistence is always a convenience, never a correctness dependency: every operation degrades
 * to "no stored session" on failure, leaving the user with the normal locked-on-refresh flow.
 */

import type { VaultInfo } from "@depvault/crypto";

const DB_NAME = "depvault";
const DB_VERSION = 1;
const STORE = "vault-session";

export interface VaultSessionRecord {
  userId: string;
  /** Non-extractable KEK; survives structured clone without exposing raw bytes. */
  kek: CryptoKey;
  /** Non-extractable ECDH private key. */
  privateKey: CryptoKey;
  vaultInfo: VaultInfo;
  /** Epoch ms after which the record is treated as absent and deleted. */
  expiresAt: number;
}

const isAvailable = (): boolean => typeof indexedDB !== "undefined";

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "userId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, mode);
    const result = await fn(tx.objectStore(STORE));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return result;
  } finally {
    db.close();
  }
}

/** Persist an unlocked session. Swallows failures — a storage error must not break unlocking. */
export async function saveVaultSession(record: VaultSessionRecord): Promise<void> {
  if (!isAvailable()) return;
  try {
    await withStore("readwrite", (store) => promisify(store.put(record)));
  } catch {
    // Persistence is best-effort; fall back to locked-on-refresh.
  }
}

/** Load a stored session, deleting and ignoring it when expired. Returns null on absence/failure. */
export async function loadVaultSession(userId: string): Promise<VaultSessionRecord | null> {
  if (!isAvailable()) return null;
  try {
    const record = await withStore("readonly", (store) =>
      promisify(store.get(userId) as IDBRequest<VaultSessionRecord | undefined>),
    );
    if (!record) return null;
    if (Date.now() > record.expiresAt) {
      await withStore("readwrite", (store) => promisify(store.delete(userId)));
      return null;
    }
    return record;
  } catch {
    return null;
  }
}

/** Remove all stored sessions (on lock, logout, or password change). */
export async function clearVaultSession(): Promise<void> {
  if (!isAvailable()) return;
  try {
    await withStore("readwrite", (store) => promisify(store.clear()));
  } catch {
    // Best-effort.
  }
}
