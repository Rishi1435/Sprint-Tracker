"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

// The `.dark` class on <html> is the source of truth (an inline script in the
// root layout sets it before paint). Subscribing to it here keeps the icons in
// sync without a mount effect or a hydration mismatch.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

/**
 * Point the browser chrome — address bar, task switcher, PWA title bar — at the
 * page background. Read from the stylesheet rather than a second copy of the
 * hex, so the two can't drift apart.
 */
function syncThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  if (bg) meta.setAttribute("content", bg);
}

/** `persist: false` for changes that arrived from elsewhere — writing them back
 *  would bounce a storage event to the tab that sent it, and on forever. */
function applyTheme(nextIsDark: boolean, persist = true) {
  document.documentElement.classList.toggle("dark", nextIsDark);
  if (persist) {
    try {
      localStorage.setItem("theme", nextIsDark ? "dark" : "light");
    } catch {
      // private mode — the class still applies for this session
    }
  }
  syncThemeColor();
  listeners.forEach((l) => l());
}

function storedTheme(): string | null {
  try {
    return localStorage.getItem("theme");
  } catch {
    return null;
  }
}

export default function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // The layout's boot script sets the meta if it exists by then; this covers
    // the case where the framework appended it afterwards.
    syncThemeColor();

    const onStorage = (e: StorageEvent) => {
      if (e.key !== "theme") return;
      if (e.newValue !== "dark" && e.newValue !== "light") return;
      applyTheme(e.newValue === "dark", false);
    };

    // Follow the OS only while the user hasn't picked a side themselves.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = (e: MediaQueryListEvent) => {
      if (storedTheme()) return;
      applyTheme(e.matches, false);
    };

    window.addEventListener("storage", onStorage);
    mq.addEventListener("change", onScheme);
    return () => {
      window.removeEventListener("storage", onStorage);
      mq.removeEventListener("change", onScheme);
    };
  }, []);

  const toggle = useCallback(() => {
    const nextIsDark = !document.documentElement.classList.contains("dark");
    const btn = btnRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!btn || !document.startViewTransition || reduced) {
      applyTheme(nextIsDark);
      return;
    }

    // The reveal opens from the button and has to reach the furthest corner, so
    // the radius is measured rather than guessed at. globals.css reads these.
    const rect = btn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const root = document.documentElement;
    root.style.setProperty("--vt-x", `${x}px`);
    root.style.setProperty("--vt-y", `${y}px`);
    root.style.setProperty("--vt-r", `${radius}px`);

    const transition = document.startViewTransition(() => applyTheme(nextIsDark));

    // A transition gets skipped if it's interrupted — a second tap, a hidden
    // tab — which rejects both promises. Nothing here needs to react, but an
    // unhandled rejection would still land in the console.
    transition.ready.catch(() => {});
    transition.finished
      .catch(() => {})
      .finally(() => {
        root.style.removeProperty("--vt-x");
        root.style.removeProperty("--vt-y");
        root.style.removeProperty("--vt-r");
      });
  }, []);

  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  // Both icons are always mounted and cross-rotate past each other, so the
  // control reads as one dial turning instead of two images swapping.
  const swap = "absolute h-[18px] w-[18px] transition-all duration-300 ease-[var(--ease-out-expo)]";

  return (
    <button
      ref={btnRef}
      onClick={toggle}
      className="vt-theme-toggle relative grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-text-muted transition-colors duration-200 hover:border-accent hover:bg-surface-raised hover:text-accent"
      aria-label={label}
      title={label}
    >
      <svg
        className={`${swap} ${isDark ? "rotate-45 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="4.25" />
        <path d="M12 2.75v1.5m0 15.5v1.5M4.75 12h-2m18.5 0h-1.5M6.34 6.34 5.28 5.28m13.44 13.44-1.06-1.06M6.34 17.66l-1.06 1.06M18.72 5.28l-1.06 1.06" />
      </svg>

      <svg
        className={`${swap} ${isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-45 scale-50 opacity-0"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20.5 14.1A8.6 8.6 0 1 1 9.9 3.5a6.7 6.7 0 0 0 10.6 10.6Z" />
      </svg>
    </button>
  );
}
