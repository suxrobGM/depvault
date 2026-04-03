import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { AUTO_LOCK_TIMEOUT_MS } from "@/constants";

interface VaultState {
  isUnlocked: boolean;
  kek: CryptoKey | null;
  dekCache: Map<string, CryptoKey>;
  unlock: (kek: CryptoKey) => void;
  lock: () => void;
  cacheDek: (projectId: string, dek: CryptoKey) => void;
  getDek: (projectId: string) => CryptoKey | undefined;
  resetIdleTimer: () => void;
}

const VaultContext = createContext<VaultState | null>(null);

export function useVault(): VaultState {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}

interface VaultProviderProps {
  children: ReactNode;
}

export function VaultProvider(props: VaultProviderProps): ReactElement {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const kekRef = useRef<CryptoKey | null>(null);
  const dekCacheRef = useRef<Map<string, CryptoKey>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lock = () => {
    kekRef.current = null;
    dekCacheRef.current.clear();
    setIsUnlocked(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetIdleTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (kekRef.current) {
      timerRef.current = setTimeout(lock, AUTO_LOCK_TIMEOUT_MS);
    }
  };

  const unlock = (kek: CryptoKey) => {
    kekRef.current = kek;
    dekCacheRef.current.clear();
    setIsUnlocked(true);
    resetIdleTimer();
  };

  const cacheDek = (projectId: string, dek: CryptoKey) => {
    dekCacheRef.current.set(projectId, dek);
  };

  const getDek = (projectId: string) => {
    return dekCacheRef.current.get(projectId);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const value: VaultState = {
    isUnlocked,
    kek: kekRef.current,
    dekCache: dekCacheRef.current,
    unlock,
    lock,
    cacheDek,
    getDek,
    resetIdleTimer,
  };

  return <VaultContext value={value}>{props.children}</VaultContext>;
}
