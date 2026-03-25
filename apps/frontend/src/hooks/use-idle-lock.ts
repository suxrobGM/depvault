"use client";

import { useEffect, useRef } from "react";

const IDLE_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"] as const;

/** Calls `onLock` after `timeoutMs` of user inactivity. Only active when `enabled` is true. */
export function useIdleLock(enabled: boolean, timeoutMs: number, onLock: () => void): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(onLock, timeoutMs);
    };

    for (const event of IDLE_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }
    resetTimer();

    return () => {
      for (const event of IDLE_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, timeoutMs, onLock]);
}
