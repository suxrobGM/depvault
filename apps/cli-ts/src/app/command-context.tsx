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
import type { CommandContext, SelectOption } from "@/types/command";

export type PromptMode = "command" | "password" | "select" | "text";

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

  /** Current input prompt mode. */
  promptMode: PromptMode;
  /** Called by CommandInput when the user submits the active prompt value. */
  submitPrompt: (value: string) => void;
  /** Options for select mode. */
  selectOptions: SelectOption[];
  /** Placeholder shown in text prompt mode. */
  textPlaceholder: string;
}

const Context = createContext<CommandContextState | null>(null);

/**
 * Module-level refs for non-React access (async command handlers).
 * Functions are stable across renders; kekRef is read live at call time.
 */
let contextRefs: {
  kekRef: { current: CryptoKey | null };
  isUnlockedRef: { current: boolean };
  requestPassword: () => Promise<string>;
  requestSelect: (options: SelectOption[]) => Promise<string>;
  requestText: (placeholder?: string) => Promise<string>;
} | null = null;

/** React hook — use in components. */
export function useCommandContext(): CommandContextState {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useCommandContext must be used within CommandContextProvider");
  return ctx;
}

/** Non-React getter — use in async command handlers. Returns null in one-shot CLI mode. */
export function getCommandContext(): CommandContext | null {
  if (!contextRefs) return null;
  return {
    isVaultUnlocked: contextRefs.isUnlockedRef.current,
    kek: contextRefs.kekRef.current,
    requestPassword: contextRefs.requestPassword,
    requestSelect: contextRefs.requestSelect,
    requestText: contextRefs.requestText,
  };
}

interface CommandContextProviderProps {
  children: ReactNode;
}

export function CommandContextProvider(props: CommandContextProviderProps): ReactElement {
  // Vault state
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);

  // Prompt state
  const [promptMode, setPromptMode] = useState<PromptMode>("command");
  const [selectOptions, setSelectOptions] = useState<SelectOption[]>([]);
  const [textPlaceholder, setTextPlaceholder] = useState("");
  const promptResolveRef = useRef<((value: string) => void) | null>(null);

  const isUnlockedRef = useRef(false);
  const kekRef = useRef<CryptoKey | null>(null);
  const dekCacheRef = useRef<Map<string, CryptoKey>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const lock = () => {
    kekRef.current = null;
    isUnlockedRef.current = false;
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
    isUnlockedRef.current = true;
    dekCacheRef.current.clear();
    setIsVaultUnlocked(true);
    resetIdleTimer();
  };

  const cacheDek = (projectId: string, dek: CryptoKey) => {
    dekCacheRef.current.set(projectId, dek);
  };

  const getDek = (projectId: string) => {
    return dekCacheRef.current.get(projectId);
  };

  const requestPassword = (): Promise<string> => {
    return new Promise((resolve) => {
      promptResolveRef.current = resolve;
      setPromptMode("password");
    });
  };

  const requestSelect = (options: SelectOption[]): Promise<string> => {
    return new Promise((resolve) => {
      promptResolveRef.current = resolve;
      setSelectOptions(options);
      setPromptMode("select");
    });
  };

  const requestText = (placeholder?: string): Promise<string> => {
    return new Promise((resolve) => {
      promptResolveRef.current = resolve;
      setTextPlaceholder(placeholder ?? "");
      setPromptMode("text");
    });
  };

  const submitPrompt = (value: string) => {
    setPromptMode("command");
    setSelectOptions([]);
    setTextPlaceholder("");
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
    requestSelect,
    requestText,
    promptMode,
    submitPrompt,
    selectOptions,
    textPlaceholder,
  };

  // Sync module-level refs so async command handlers can read live state
  contextRefs = { kekRef, isUnlockedRef, requestPassword, requestSelect, requestText };

  return <Context value={value}>{props.children}</Context>;
}
