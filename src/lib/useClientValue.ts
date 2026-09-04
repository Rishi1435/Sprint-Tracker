"use client";

import { useSyncExternalStore } from "react";

// Nothing to subscribe to: these values are read once, right after hydration.
const noopSubscribe = () => () => {};

/**
 * Read a browser-only value (localStorage, `Notification.permission`, a class on
 * `<html>`, …) without a mount effect.
 *
 * React uses `serverValue` for SSR and for the hydration pass, then re-checks
 * `read()` once hydration finishes and re-renders if it differs. That gives us
 * matching server/client markup without `setState` inside an effect.
 *
 * `read` must return a primitive (or a stable reference) — React calls it on
 * every render and throws if the value keeps changing identity.
 */
export function useClientValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, read, () => serverValue);
}

/** True only after hydration has completed on the client. */
export function useHydrated(): boolean {
  return useClientValue(readTrue, false);
}

function readTrue() {
  return true;
}
