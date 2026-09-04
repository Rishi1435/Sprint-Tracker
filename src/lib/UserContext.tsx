"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { getUserById } from "./db";
import { authEnabled, onAuthChange } from "./auth";
import type { UserRow } from "./types";

const STORAGE_KEY_ID = "sprintroom_user_id";
const STORAGE_KEY_USER = "sprintroom_user_cache";

/* --------------------------------------------------------------------------
 * Session store
 *
 * The session lives outside React so it can be read *during render* — no mount
 * effect, no `setState` in an effect, and no navbar flicker while the cached
 * row is revalidated. `snapshot` is only reassigned when the session actually
 * changes, which keeps the reference stable for `useSyncExternalStore`.
 * ------------------------------------------------------------------------ */

interface Session {
  user: UserRow | null;
  /** False until we know whether somebody is signed in (cache hit or fetch). */
  resolved: boolean;
}

const EMPTY: Session = { user: null, resolved: false };

let snapshot: Session = EMPTY;
let seeded = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(next: Session) {
  snapshot = next;
  listeners.forEach((l) => l());
}

function readCache(): UserRow | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    return raw ? (JSON.parse(raw) as UserRow) : null;
  } catch {
    return null;
  }
}

/**
 * Seeds itself from the localStorage cache the first time it runs on the
 * client. React uses `getServerSnapshot` for SSR and for the hydration pass,
 * then re-reads this once hydration finishes — so the markup always matches.
 */
function getSnapshot(): Session {
  if (!seeded) {
    seeded = true;
    const cached = readCache();
    if (cached) snapshot = { user: cached, resolved: true };
  }
  return snapshot;
}

function getServerSnapshot(): Session {
  return EMPTY;
}

/** Persist + broadcast a signed-in user. */
function writeSession(u: UserRow) {
  try {
    localStorage.setItem(STORAGE_KEY_ID, u.id);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(u));
  } catch {
    // private mode — the session still holds for this tab
  }
  seeded = true;
  publish({ user: u, resolved: true });
}

/** Forget the session everywhere. */
function wipeSession() {
  try {
    localStorage.removeItem(STORAGE_KEY_ID);
    localStorage.removeItem(STORAGE_KEY_USER);
  } catch {
    // ignore
  }
  seeded = true;
  publish({ user: null, resolved: true });
}

function patchSession(updates: Partial<UserRow>) {
  const current = getSnapshot().user;
  if (!current) return;
  writeSession({ ...current, ...updates });
}

/** Revalidate the cached row against the database. */
async function loadSession(): Promise<void> {
  let id: string | null = null;
  try {
    id = localStorage.getItem(STORAGE_KEY_ID);
  } catch {
    // ignore
  }
  if (!id) {
    wipeSession();
    return;
  }
  try {
    const fresh = await getUserById(id);
    if (fresh) writeSession(fresh);
    else wipeSession();
  } catch {
    // Offline: keep the cached user, but stop showing a loading state.
    publish({ user: getSnapshot().user, resolved: true });
  }
}

/* ------------------------------------------------------------------------ */

interface UserContextValue {
  user: UserRow | null;
  loading: boolean;
  setSession: (u: UserRow) => void;
  clearSession: () => void;
  updateUserSession: (updates: Partial<UserRow>) => void;
  reload: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
  setSession: () => {},
  clearSession: () => {},
  updateUserSession: () => {},
  reload: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const session = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    void loadSession();
  }, []);

  // With Supabase Auth on, sign-in events take over the session.
  useEffect(() => {
    if (!authEnabled) return;
    return onAuthChange(({ user, event }) => {
      if (user) {
        writeSession(user);
        return;
      }
      // A null user on INITIAL_SESSION only means "not signed in by email" —
      // a quick-join session is still perfectly valid. Only an explicit
      // sign-out clears it.
      if (event === "SIGNED_OUT") wipeSession();
    });
  }, []);

  const setSession = useCallback((u: UserRow) => writeSession(u), []);
  const clearSession = useCallback(() => wipeSession(), []);
  const updateUserSession = useCallback(
    (updates: Partial<UserRow>) => patchSession(updates),
    []
  );
  const reload = useCallback(() => loadSession(), []);

  const value = useMemo<UserContextValue>(
    () => ({
      user: session.user,
      loading: !session.resolved,
      setSession,
      clearSession,
      updateUserSession,
      reload,
    }),
    [session, setSession, clearSession, updateUserSession, reload]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useCurrentUser() {
  return useContext(UserContext);
}
