// Shared helpers for the db:* scripts. Values are only ever put into
// process.env — nothing here prints a credential.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ENV_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");

/**
 * Fills in anything `.env.local` defines that the shell hasn't already set, so
 * an explicit `SUPABASE_DB_URL=… npm run db:migrate` still wins.
 */
export function loadEnvLocal() {
  let text;
  try {
    text = readFileSync(ENV_PATH, "utf8");
  } catch {
    return; // No .env.local — the shell environment is all we have.
  }
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^(['"])([\s\S]*)\1$/, "$2");
  }
}

/** `https://abcdefgh.supabase.co` → `abcdefgh`. */
export function projectRef(url) {
  const match = /^https?:\/\/([a-z0-9]+)\.supabase\./i.exec(url ?? "");
  return match ? match[1] : null;
}
