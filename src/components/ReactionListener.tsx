"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { listUsers, subscribeToReactionsFor } from "@/lib/db";
import type { ReactionRow, UserRow } from "@/lib/types";
import ToastList, { type Toast } from "./Toast";

const REACTIONS: Record<string, { emoji: string; says: string }> = {
  cheer: { emoji: "🎉", says: "cheered you on" },
  fire: { emoji: "🔥", says: "says you're on fire" },
  clap: { emoji: "👏", says: "clapped for your day" },
  star: { emoji: "⭐", says: "starred your day" },
};

export default function ReactionListener() {
  const { user } = useCurrentUser();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [users, setUsers] = useState<Record<string, UserRow>>({});

  // Lazy-load user directory (for sender name lookup)
  useEffect(() => {
    if (!user) return;
    listUsers()
      .then((u) => {
        const m: Record<string, UserRow> = {};
        for (const x of u) m[x.id] = x;
        setUsers(m);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToReactionsFor(user.id, (r: ReactionRow) => {
      const sender = users[r.from_user_id];
      const senderName = sender?.nickname || sender?.name || "Someone";
      // The emoji rides in `icon`, where the toast draws it once. Putting it in
      // the title as well printed it twice.
      const meta = REACTIONS[r.type] ?? { emoji: "🔔", says: `sent you a ${r.type}` };
      const id = `${r.id}-${Date.now()}`;
      setToasts((prev) => [
        ...prev,
        {
          id,
          title: `${senderName} ${meta.says}`,
          body: r.day_number ? `For your day ${r.day_number}.` : "Keep it going.",
          icon: meta.emoji,
        },
      ]);
    });
    return unsub;
  }, [user, users]);

  if (!user) return null;

  return (
    <ToastList
      toasts={toasts}
      onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
    />
  );
}
