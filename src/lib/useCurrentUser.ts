"use client";

import { useEffect, useState, useCallback } from "react";
import { getUserById } from "./db";
import type { UserRow } from "./types";

const STORAGE_KEY = "sprintroom_user_id";

export function useCurrentUser() {
  const [user, setUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const id = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!id) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const u = await getUserById(id);
      setUser(u);
      if (!u) localStorage.removeItem(STORAGE_KEY);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial session fetch on mount
    load();
  }, [load]);

  const setSession = useCallback((u: UserRow) => {
    localStorage.setItem(STORAGE_KEY, u.id);
    setUser(u);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return { user, loading, setSession, clearSession, reload: load };
}
