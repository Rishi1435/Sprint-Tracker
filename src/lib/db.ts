import { supabase } from "./supabaseClient";
import type { UserRow, ProgressRow } from "./types";
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

  const insertObj: any = { name: trimmed, start_date: todayISO() };
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
): Promise<void> {
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
}
