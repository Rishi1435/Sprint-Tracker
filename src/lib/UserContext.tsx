"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getUserById } from "./db";
import type { UserRow } from "./types";

const STORAGE_KEY_ID = "sprintroom_user_id";
const STORAGE_KEY_USER = "sprintroom_user_cache";

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
  const [user, setUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);

  // Synchronously load from localStorage cache on mount to eliminate navbar flicker
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_USER);
      if (cached) {
        setUser(JSON.parse(cached));
        setLoading(false);
      }
    } catch {
      // ignore
    }
  }, []);

  const load = useCallback(async () => {
    const id = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_ID) : null;
    if (!id) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const u = await getUserById(id);
      setUser(u);
      if (u) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(u));
      } else {
        localStorage.removeItem(STORAGE_KEY_ID);
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    } catch {
      // Keep cached user if offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setSession = useCallback((u: UserRow) => {
    localStorage.setItem(STORAGE_KEY_ID, u.id);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(u));
    setUser(u);
    setLoading(false);
  }, []);

  const updateUserSession = useCallback((updates: Partial<UserRow>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_ID);
    localStorage.removeItem(STORAGE_KEY_USER);
    setUser(null);
    setLoading(false);
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        setSession,
        clearSession,
        updateUserSession,
        reload: load,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(UserContext);
}
