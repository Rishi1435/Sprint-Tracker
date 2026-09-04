"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

// The `.dark` class on <html> is the source of truth (an inline script in the
// root layout sets it before paint). Subscribing to it here keeps the icons in
// sync without a mount effect or a hydration mismatch.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

function applyTheme(nextIsDark: boolean) {
  document.documentElement.classList.toggle("dark", nextIsDark);
  try {
    localStorage.setItem("theme", nextIsDark ? "dark" : "light");
  } catch {
    // private mode — the class still applies for this session
  }
  listeners.forEach((l) => l());
}

export default function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const btnRef = useRef<HTMLButtonElement>(null);

  const toggle = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;

    // Accurately get the exact center of the toggle button in viewport coordinates
    const rect = btn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    // Calculate the exact max radius to reach the furthest corner of the viewport
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const nextIsDark = !document.documentElement.classList.contains("dark");

    // Fallback for browsers that don't support View Transitions API or if user prefers reduced motion
    if (
      !document.startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      applyTheme(nextIsDark);
      return;
    }

    // Start View Transition
    const transition = document.startViewTransition(() => {
      applyTheme(nextIsDark);
    });

    // Hardware-accelerated circular reveal via Web Animations API directly on the pseudoElement
    // This directly applies pixel-accurate coordinates on all screen sizes & resolutions
    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 500,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  }, []);

  return (
    <button
      ref={btnRef}
      onClick={toggle}
      className="group relative grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-text-muted transition-all duration-300 hover:border-accent hover:text-accent hover:shadow-[0_0_12px_var(--accent-soft)]"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Sun icon */}
      <svg
        className={`absolute h-[18px] w-[18px] transition-all duration-500 ${
          isDark
            ? "rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
      </svg>

      {/* Moon icon */}
      <svg
        className={`absolute h-[18px] w-[18px] transition-all duration-500 ${
          isDark
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
      </svg>
    </button>
  );
}
