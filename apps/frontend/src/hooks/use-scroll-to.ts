"use client";

type ScrollToFn = (id: string) => void;

/**
 * Custom hook to scroll smoothly to an element by its ID, with an offset for fixed headers.
 * @returns A function that takes an element ID and scrolls to it smoothly.
 */
export function useScrollTo(): ScrollToFn {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return scrollTo;
}
