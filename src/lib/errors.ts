/**
 * Turning thrown values into text we control.
 *
 * Supabase's `PostgrestError` extends `Error`, and the fields that actually say
 * what went wrong — `code`, `details`, `hint` — are dropped when a browser
 * console argument is serialised for the dev overlay, so `console.error(err)`
 * renders a useless `{}`. Everything here builds a string instead, so the cause
 * survives into the log and into the UI.
 */

/** The shape Supabase errors add on top of `Error`. */
interface ErrorLike {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
}

/** PostgREST/Postgres codes for "that table isn't there". */
const MISSING_TABLE = new Set(["PGRST205", "42P01"]);
/** …and for "that column isn't there", which a pending migration also causes. */
const MISSING_COLUMN = new Set(["PGRST204", "42703"]);
/** Row-level security said no. */
const DENIED = new Set(["42501", "PGRST301"]);

function asErrorLike(err: unknown): ErrorLike | null {
  return typeof err === "object" && err !== null ? (err as ErrorLike) : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** The Postgres/PostgREST code, when the thrown value carries one. */
export function errorCode(err: unknown): string | null {
  return text(asErrorLike(err)?.code);
}

/** True when the failure is a schema gap rather than anything the user did. */
export function isSchemaError(err: unknown): boolean {
  const code = errorCode(err);
  return code !== null && (MISSING_TABLE.has(code) || MISSING_COLUMN.has(code));
}

/**
 * A full one-line description for the console: message, code and hint, all
 * flattened into a string so nothing can strip them out again.
 */
export function describeError(err: unknown): string {
  if (typeof err === "string") return err;

  const like = asErrorLike(err);
  if (!like) return String(err);

  const parts: string[] = [];
  const code = text(like.code);
  const message = text(like.message);
  const name = text(like.name);

  parts.push(message ?? name ?? "unknown error");
  if (code) parts.push(`[${code}]`);

  const details = text(like.details);
  const hint = text(like.hint);
  if (details) parts.push(`— ${details}`);
  if (hint) parts.push(`— hint: ${hint}`);

  return parts.join(" ");
}

/** A short, calm line to put in front of the person who hit the failure. */
export function friendlyError(err: unknown): string {
  const code = errorCode(err);

  if (code && MISSING_TABLE.has(code)) return "This feature isn't set up on the database yet.";
  if (code && MISSING_COLUMN.has(code)) return "The database is missing a field this needs.";
  if (code && DENIED.has(code)) return "You don't have permission to do that.";
  if (code === "23505") return "That's already been saved.";

  const message = text(asErrorLike(err)?.message) ?? "";
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "Couldn't reach the server — check your connection.";
  }

  return "Something went wrong. Please try again.";
}
