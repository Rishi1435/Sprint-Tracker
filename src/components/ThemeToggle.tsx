"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

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

    const isCurrentlyDark = document.documentElement.classList.contains("dark");
    const nextIsDark = !isCurrentlyDark;

    // Fallback for browsers that don't support View Transitions API or if user prefers reduced motion
    if (
      !document.startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setIsDark(nextIsDark);
      document.documentElement.classList.toggle("dark", nextIsDark);
      localStorage.setItem("theme", nextIsDark ? "dark" : "light");
      return;
    }

    // Start View Transition
    const transition = document.startViewTransition(() => {
      setIsDark(nextIsDark);
      document.documentElement.classList.toggle("dark", nextIsDark);
      localStorage.setItem("theme", nextIsDark ? "dark" : "light");
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

  if (!mounted) {
    return (
      <button
        className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-text-muted"
        aria-label="Toggle theme"
      >
        <span className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      ref={btnRef}
      onClick={toggle}
      className="group relative grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-text-muted transition-all duration-300 hover:border-accent hover:text-accent hover:shadow-[0_0_12px_var(--accent-soft)]"
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
