import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Read .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
let supabaseUrl = "";
let supabaseAnonKey = "";

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) {
      supabaseUrl = trimmed.replace("NEXT_PUBLIC_SUPABASE_URL=", "").trim();
    }
    if (trimmed.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY=")) {
      supabaseAnonKey = trimmed.replace("NEXT_PUBLIC_SUPABASE_ANON_KEY=", "").trim();
    }
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function reset() {
  console.log("Connecting to Supabase at:", supabaseUrl);

  // 1. Delete all progress rows
  const { error: pErr } = await supabase.from("progress").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (pErr) {
    console.error("Error deleting progress records:", pErr.message);
  } else {
    console.log("✓ Successfully cleared all progress records from Supabase.");
  }

  // 2. Delete all users
  const { error: uErr } = await supabase.from("users").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (uErr) {
    console.error("Error deleting user records:", uErr.message);
  } else {
    console.log("✓ Successfully cleared all users from Supabase.");
  }

  console.log("Database reset complete! Everything is fresh.");
}

reset();
