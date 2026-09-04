// Read-only schema check: asks the live Supabase REST API for every table and
// column the app relies on, and reports what's missing. Needs only the public
// URL and anon key, so it's safe to run anywhere — it writes nothing.
//
//   npm run db:check
//
// A non-zero exit means the database is behind the app; `npm run db:migrate`
// closes the gap.
import { loadEnvLocal } from "./env.mjs";

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.");
  process.exit(1);
}

/** Table → the columns the app reads or writes, and what breaks without them. */
const EXPECTED = [
  { table: "users", columns: ["id", "name", "nickname", "start_date"], feature: "everything" },
  { table: "users", columns: ["email", "auth_user_id"], feature: "magic-link sign-in" },
  { table: "progress", columns: ["user_id", "day_number"], feature: "the daily checklist" },
  { table: "progress", columns: ["notes"], feature: "per-day notes" },
  { table: "reactions", columns: ["from_user_id", "to_user_id", "type"], feature: "squad cheers" },
  { table: "sprints", columns: ["owner_id", "total_days"], feature: "custom sprint plans" },
  { table: "sprint_categories", columns: ["sprint_id", "key"], feature: "custom sprint plans" },
  { table: "sprint_tasks", columns: ["sprint_id", "day_number"], feature: "custom sprint plans" },
  { table: "sprint_completions", columns: ["sprint_id", "user_id"], feature: "custom sprint plans" },
];

async function probe(table, columns) {
  const endpoint = `${url}/rest/v1/${table}?select=${columns.join(",")}&limit=1`;
  let res;
  try {
    res = await fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  } catch (err) {
    return { ok: false, reason: `unreachable (${err.message})` };
  }
  if (res.ok) return { ok: true };

  const body = await res.json().catch(() => ({}));
  // PGRST205 is "no such table"; 42703 is "no such column".
  if (body.code === "PGRST205") return { ok: false, reason: "table does not exist" };
  if (body.code === "42703") return { ok: false, reason: body.message ?? "column does not exist" };
  return { ok: false, reason: body.message ?? `HTTP ${res.status}` };
}

const results = await Promise.all(
  EXPECTED.map(async (spec) => ({ ...spec, ...(await probe(spec.table, spec.columns)) }))
);

const missing = results.filter((r) => !r.ok);
for (const r of results) {
  const label = `${r.table} (${r.columns.join(", ")})`;
  console.log(r.ok ? `  ok      ${label}` : `  MISSING ${label} — ${r.reason}`);
}

if (missing.length === 0) {
  console.log("\n✓ The database matches the app.");
} else {
  const features = [...new Set(missing.map((r) => r.feature))];
  console.log(
    `\n✗ ${missing.length} check(s) failed. Broken until migrated: ${features.join(", ")}.\n` +
      "  Fix: npm run db:migrate   (additive and repeatable — no table or row is dropped)"
  );
  process.exitCode = 1;
}
