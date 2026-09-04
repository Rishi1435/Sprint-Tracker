import { supabase } from "./supabaseClient";
import type { UserRow, ProgressRow, ReactionRow, ReactionType } from "./types";
import type { TaskKey } from "./plan";
import { todayISO } from "./date";

export async function getOrCreateUser(name: string, nickname?: string): Promise<UserRow> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name can't be empty");

  const { data: existing, error: findError } = await supabase
    .from("users")
    .select("*")
    .ilike("name", trimmed)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) {
    // If a nickname was provided and differs from existing, update it
    if (nickname?.trim() && existing.nickname !== nickname.trim()) {
      const { data: updated } = await supabase
        .from("users")
        .update({ nickname: nickname.trim() })
        .eq("id", existing.id)
        .select()
        .single();
      if (updated) return updated as UserRow;
    }
    return existing as UserRow;
  }

  // New user starts with start_date as null until they complete their first task
  const insertObj: { name: string; start_date: string | null; nickname?: string } = {
    name: trimmed,
    start_date: null,
  };
  if (nickname?.trim()) insertObj.nickname = nickname.trim();

  const { data, error } = await supabase
    .from("users")
    .insert(insertObj)
    .select()
    .single();

  if (error) throw error;
  return data as UserRow;
}

export async function updateUserNickname(id: string, nickname: string): Promise<UserRow> {
  const { data, error } = await supabase
    .from("users")
    .update({ nickname: nickname.trim() || null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as UserRow;
}

/**
 * Look up a local user row by its linked Supabase Auth user id.
 * Used to find the right profile when a user signs in via magic link.
 */
export async function getUserByAuthId(authUserId: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw error;
  return (data as UserRow) ?? null;
}

/**
 * Link a Supabase Auth user to an existing local user row (or create a new one
 * if none exists yet). Returns the resulting local user row.
 */
export async function linkAuthUser(
  authUserId: string,
  email: string,
  existingUserId?: string
): Promise<UserRow> {
  // If we already have a row linked, return it
  const existing = await getUserByAuthId(authUserId).catch(() => null);
  if (existing) return existing;

  if (existingUserId) {
    // Link auth id + email to the local row
    const { data, error } = await supabase
      .from("users")
      .update({ auth_user_id: authUserId, email })
      .eq("id", existingUserId)
      .select()
      .single();
    if (error) throw error;
    return data as UserRow;
  }

  // Otherwise, create a fresh profile based on the email local-part
  const baseName = (email.split("@")[0] || "user")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 30) || `user-${Date.now().toString(36)}`;

  // Try a few variations to avoid clobbering an existing name
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? baseName : `${baseName}${i}`;
    const { data: conflict } = await supabase
      .from("users")
      .select("id")
      .ilike("name", candidate)
      .maybeSingle();
    if (conflict) continue;

    const { data, error } = await supabase
      .from("users")
      .insert({
        name: candidate,
        email,
        auth_user_id: authUserId,
        start_date: null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as UserRow;
  }
  throw new Error("Could not create a unique username from your email.");
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const { data, error } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as UserRow) ?? null;
}

export async function listUsers(): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as UserRow[];
}

export async function getProgressForUser(userId: string): Promise<ProgressRow[]> {
  const { data, error } = await supabase.from("progress").select("*").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as ProgressRow[];
}

export async function getAllProgress(): Promise<ProgressRow[]> {
  const { data, error } = await supabase.from("progress").select("*");
  if (error) throw error;
  return (data ?? []) as ProgressRow[];
}

export async function setTask(
  userId: string,
  day: number,
  taskKey: TaskKey,
  value: boolean
): Promise<{ startDateUpdated?: string }> {
  const { error } = await supabase.from("progress").upsert(
    {
      user_id: userId,
      day_number: day,
      [taskKey]: value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,day_number" }
  );
  if (error) throw error;

  // When marking a task as done, check if user's start_date needs to be initialized
  if (value) {
    const { data: userData } = await supabase
      .from("users")
      .select("start_date")
      .eq("id", userId)
      .maybeSingle();

    if (userData && !userData.start_date) {
      const today = todayISO();
      await supabase
        .from("users")
        .update({ start_date: today })
        .eq("id", userId);
      return { startDateUpdated: today };
    }
  }

  return {};
}

/* ─────────────────────────────────────────────────────────
   REALTIME SUBSCRIPTIONS
   Subscribe to inserts/updates/deletes on progress and users.
   Returns an unsubscribe function.
   ───────────────────────────────────────────────────────── */

export type ProgressChangeEvent = {
  type: "INSERT" | "UPDATE" | "DELETE";
  row?: ProgressRow;
  old?: ProgressRow;
};

export function subscribeToAllProgress(
  onChange: (evt: ProgressChangeEvent) => void
): () => void {
  const channel = supabase
    .channel("public:progress")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "progress" },
      (payload) => {
        const evt = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
        onChange({
          type: evt,
          row: payload.new as ProgressRow | undefined,
          old: payload.old as ProgressRow | undefined,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToUsers(
  onChange: () => void
): () => void {
  const channel = supabase
    .channel("public:users")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "users" },
      () => onChange()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function setDayNotes(
  userId: string,
  day: number,
  notes: string
): Promise<void> {
  const { error } = await supabase.from("progress").upsert(
    {
      user_id: userId,
      day_number: day,
      notes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,day_number" }
  );
  if (error) throw error;
}

/* ─────────────────────────────────────────────────────────
   REACTIONS
   ───────────────────────────────────────────────────────── */

export async function addReaction(
  fromUserId: string,
  toUserId: string,
  type: ReactionType,
  dayNumber?: number
): Promise<ReactionRow> {
  const { data, error } = await supabase
    .from("reactions")
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      type,
      day_number: dayNumber ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ReactionRow;
}

export async function listReactionsForUser(
  toUserId: string
): Promise<ReactionRow[]> {
  const { data, error } = await supabase
    .from("reactions")
    .select("*")
    .eq("to_user_id", toUserId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as ReactionRow[];
}

export function subscribeToReactionsFor(
  toUserId: string,
  onReaction: (r: ReactionRow) => void
): () => void {
  const channel = supabase
    .channel(`public:reactions:${toUserId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "reactions",
        filter: `to_user_id=eq.${toUserId}`,
      },
      (payload) => {
        onReaction(payload.new as ReactionRow);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
