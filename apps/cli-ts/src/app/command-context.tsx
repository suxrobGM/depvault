import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { AUTO_LOCK_TIMEOUT_MS } from "@/constants";
import type { CommandContext } from "@/types/command";

type PromptMode = "command" | "password";

interface CommandContextState extends CommandContext {
  /** Current KEK for decrypting project DEKs. */
  kek: CryptoKey | null;
  /** Cache of resolved DEKs keyed by project ID. */
  dekCache: Map<string, CryptoKey>;
  /** Store the KEK and mark vault as unlocked. */
  unlock: (kek: CryptoKey) => void;
  /** Clear KEK/DEK cache and mark vault as locked. */
  lock: () => void;
  /** Cache a resolved DEK for a project. */
  cacheDek: (projectId: string, dek: CryptoKey) => void;
  /** Retrieve a cached DEK by project ID. */
  getDek: (projectId: string) => CryptoKey | undefined;
  /** Reset the auto-lock idle timer. */
  resetIdleTimer: () => void;

  /** Current input prompt mode ("command" or "password"). */
  promptMode: PromptMode;
  /** Called by CommandInput when the user submits the active prompt value. */
  submitPrompt: (value: string) => void;
}

const Context = createContext<CommandContextState | null>(null);

/** Full command context — vault state, prompt control, and handler context. */
export function useCommandContext(): CommandContextState {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useCommandContext must be used within CommandContextProvider");
  return ctx;
}

interface CommandContextProviderProps {
  children: ReactNode;
}

export function CommandContextProvider(props: CommandContextProviderProps): ReactElement {
  // Vault state
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const kekRef = useRef<CryptoKey | null>(null);
  const dekCacheRef = useRef<Map<string, CryptoKey>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lock = () => {
    kekRef.current = null;
    dekCacheRef.current.clear();
    setIsVaultUnlocked(false);
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
    setIsVaultUnlocked(true);
    resetIdleTimer();
  };
  const cacheDek = useCallback((projectId: string, dek: CryptoKey) => {
    dekCacheRef.current.set(projectId, dek);
  }, []);

  const getDek = (projectId: string) => {
    return dekCacheRef.current.get(projectId);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Prompt state
  const [promptMode, setPromptMode] = useState<PromptMode>("command");
  const promptResolveRef = useRef<((value: string) => void) | null>(null);

  const requestPassword = (): Promise<string> => {
    return new Promise((resolve) => {
      promptResolveRef.current = resolve;
      setPromptMode("password");
    });
  };

  const submitPrompt = (value: string) => {
    setPromptMode("command");
    promptResolveRef.current?.(value);
    promptResolveRef.current = null;
  };

  const value: CommandContextState = {
    isVaultUnlocked,
    kek: kekRef.current,
    dekCache: dekCacheRef.current,
    unlock,
    lock,
    cacheDek,
    getDek,
    resetIdleTimer,
    requestPassword,
    promptMode,
    submitPrompt,
  };

  return <Context value={value}>{props.children}</Context>;
}
