// Additive migration — brings an existing database up to the current schema
// without dropping any table or row. Safe to run repeatedly.
//
// Adds: progress.notes, users.email, users.auth_user_id, the reactions table,
// the custom-sprint tables, the auth-aware RLS policies and realtime.
// The statements themselves live in scripts/migration.sql.
//
//   npm run db:migrate            apply it
//   npm run db:migrate -- --print dump the SQL, e.g. to paste into the
//                                 Supabase dashboard's SQL Editor instead
//
// Credentials are read from the environment or .env.local, and never printed:
//   SUPABASE_DB_URL / DATABASE_URL   full connection string (preferred), or
//   SUPABASE_DB_HOST + SUPABASE_DB_USER + SUPABASE_DB_PASSWORD, or
//   SUPABASE_DB_PASSWORD alone, with the project ref taken from
//   NEXT_PUBLIC_SUPABASE_URL (direct connection — needs IPv6 on some networks)
import pg from "pg";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal, projectRef } from "./env.mjs";

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_PATH = join(__dirname, "migration.sql");

const CREDENTIALS_HELP =
  "Missing database credentials.\n" +
  "Copy the connection string from Supabase → Project Settings → Database and add it\n" +
  "to .env.local as SUPABASE_DB_URL, or set SUPABASE_DB_PASSWORD there.\n" +
  "No connection at all? Run `npm run db:migrate -- --print` and paste the SQL into\n" +
  "the Supabase dashboard's SQL Editor.";

/**
 * Discrete fields rather than an interpolated URL: a password with `@`, `#` or
 * `/` in it would silently corrupt a hand-built connection string.
 */
function buildConfig() {
  const ssl = { rejectUnauthorized: false };
  const connectionTimeoutMillis = 15000;

  const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (url) return { connectionString: url, ssl, connectionTimeoutMillis };

  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    console.error(CREDENTIALS_HELP);
    process.exit(1);
  }

  const ref = projectRef(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const host = process.env.SUPABASE_DB_HOST || (ref && `db.${ref}.supabase.co`);
  const user = process.env.SUPABASE_DB_USER || (ref && "postgres");
  if (!host || !user) {
    console.error(CREDENTIALS_HELP);
    process.exit(1);
  }

  return {
    host,
    user,
    password,
    port: Number(process.env.SUPABASE_DB_PORT ?? (process.env.SUPABASE_DB_HOST ? 6543 : 5432)),
    database: process.env.SUPABASE_DB_NAME ?? "postgres",
    ssl,
    connectionTimeoutMillis,
  };
}

/** DNS and routing failures here almost always mean "use the pooler instead". */
function explain(err) {
  const code = err?.code;
  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "ENETUNREACH" || code === "ETIMEDOUT") {
    return (
      "\nThe direct database host was unreachable. Supabase serves it over IPv6 only, so on\n" +
      "an IPv4 network use the pooler: Supabase → Project Settings → Database → Connection\n" +
      "pooling, then put that string in .env.local as SUPABASE_DB_URL. Or run\n" +
      "`npm run db:migrate -- --print` and paste the SQL into the SQL Editor."
    );
  }
  if (code === "28P01") return "\nThe database password was rejected — reset it under Project Settings → Database.";
  return "";
}

async function main() {
  const sql = readFileSync(SQL_PATH, "utf8");
  if (process.argv.includes("--print")) {
    process.stdout.write(sql);
    return;
  }

  loadEnvLocal();
  const client = new Client(buildConfig());
  try {
    await client.connect();
    await client.query(sql);
    console.log("✓ Migration applied — columns, reactions, sprint tables, RLS and realtime are current.");
    console.log("  Verify with `npm run db:check`.");
  } catch (err) {
    console.error(`Migration failed: ${err.message}${explain(err)}`);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();
