// Applies supabase-schema.sql to your Supabase Postgres database.
//
// WARNING: the schema script DROPS every table. All progress is lost.
// Pass --yes to skip the confirmation prompt.
//
// Credentials come from the environment (never commit them):
//   SUPABASE_DB_URL       full connection string (preferred), or
//   SUPABASE_DB_HOST      e.g. aws-0-ap-south-1.pooler.supabase.com
//   SUPABASE_DB_USER      e.g. postgres.<project-ref>
//   SUPABASE_DB_PASSWORD  your database password
//   SUPABASE_DB_PORT      defaults to 6543 (transaction pooler)
//   SUPABASE_DB_NAME      defaults to postgres
//
// Example (bash):
//   SUPABASE_DB_URL="postgresql://postgres.abc:pw@aws-0-ap-south-1.pooler.supabase.com:6543/postgres" \
//     npm run db:schema -- --yes

import pg from "pg";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, "..", "supabase-schema.sql");

function buildConfig() {
  const url = process.env.SUPABASE_DB_URL;
  if (url) {
    return { connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 };
  }

  const host = process.env.SUPABASE_DB_HOST;
  const user = process.env.SUPABASE_DB_USER;
  const password = process.env.SUPABASE_DB_PASSWORD;

  if (!host || !user || !password) {
    console.error(
      "Missing database credentials.\n" +
        "Set SUPABASE_DB_URL, or SUPABASE_DB_HOST + SUPABASE_DB_USER + SUPABASE_DB_PASSWORD.\n" +
        "Find them in Supabase → Project Settings → Database → Connection string."
    );
    process.exit(1);
  }

  return {
    host,
    user,
    password,
    port: Number(process.env.SUPABASE_DB_PORT ?? 6543),
    database: process.env.SUPABASE_DB_NAME ?? "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  };
}
async function confirm() {
  if (process.argv.includes("--yes") || process.argv.includes("-y")) return true;
  if (!process.stdin.isTTY) {
    console.error("Refusing to drop tables without a TTY. Re-run with --yes if you're sure.");
    return false;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    "This DROPS every Sprint Room table and all saved progress.\nType RESET to continue: "
  );
  rl.close();
  return answer.trim() === "RESET";
}

async function main() {
  const sql = readFileSync(SCHEMA_PATH, "utf8");
  if (!(await confirm())) {
    console.log("Aborted — nothing was changed.");
    process.exit(1);
  }

  const client = new Client(buildConfig());
  try {
    await client.connect();
    console.log("✓ Connected. Applying supabase-schema.sql…");
    await client.query(sql);
    console.log("✓ Schema applied: users, progress, reactions, sprints + RLS + realtime.");
  } catch (err) {
    console.error("Schema reset failed:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();
