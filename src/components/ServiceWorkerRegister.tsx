"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker — in production only.
 *
 * In development the worker is actively torn down instead. Its cache-first
 * branch keys on URL, and dev chunk URLs stay the same while their contents
 * change, so a registration left over from a production build (or from an
 * earlier version of `sw.js`) serves stale JavaScript forever: pages then fail
 * with errors like "getDayPlan is not a function" that survive restarting the
 * dev server and deleting `.next`, because the bad copy lives in the browser.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void unregisterAll();
      return;
    }

    // Register after page load to avoid blocking first paint
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          console.warn("Service worker registration failed:", err);
        });
    };
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}

/** Drops any worker and its caches, so the next load is served fresh. */
async function unregisterAll() {
  try {
    // Only this page being *controlled* means it was served worker-cached
    // assets, which is what makes a one-off reload worth it.
    const wasControlled = Boolean(navigator.serviceWorker.controller);
    const registrations = await navigator.serviceWorker.getRegistrations();
    const removed = await Promise.all(registrations.map((r) => r.unregister()));
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("sprint-room")).map((k) => caches.delete(k)));
    }
    // Guarded on a successful unregister, so this can't reload in a loop.
    if (wasControlled && removed.some(Boolean)) {
      console.info("Removed the development service worker — reloading for fresh assets.");
      window.location.reload();
    }
  } catch {
    // Nothing actionable: the worker just stays until the browser drops it.
  }
}
