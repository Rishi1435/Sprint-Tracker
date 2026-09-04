import { describe, expect, it } from "vitest";
import { describeError, errorCode, friendlyError, isSchemaError } from "@/lib/errors";

/** What supabase-js throws: a real Error subclass carrying PostgREST fields. */
class FakePostgrestError extends Error {
  code: string;
  details: string | null;
  hint: string | null;
  constructor(message: string, code: string, details: string | null = null, hint: string | null = null) {
    super(message);
    this.name = "PostgrestError";
    this.code = code;
    this.details = details;
    this.hint = hint;
  }
}

describe("describeError", () => {
  it("never collapses a thrown Error to an empty object", () => {
    // The bug this exists for: console.error(err) rendered `{}` because an
    // Error's message and stack aren't own enumerable properties.
    const described = describeError(new Error("boom"));
    expect(described).toBe("boom");
    expect(described).not.toBe("{}");
    expect(JSON.stringify(new Error("boom"))).toBe("{}");
  });

  it("keeps the PostgREST code alongside the message", () => {
    const err = new FakePostgrestError(
      "Could not find the table 'public.reactions' in the schema cache",
      "PGRST205"
    );
    expect(describeError(err)).toBe(
      "Could not find the table 'public.reactions' in the schema cache [PGRST205]"
    );
  });

  it("appends details and hint when the server sends them", () => {
    const err = new FakePostgrestError("denied", "42501", "RLS blocked it", "check your policies");
    expect(describeError(err)).toBe("denied [42501] — RLS blocked it — hint: check your policies");
  });

  it("passes a string through and survives values that aren't errors at all", () => {
    expect(describeError("plain message")).toBe("plain message");
    expect(describeError(null)).toBe("null");
    expect(describeError(undefined)).toBe("undefined");
    expect(describeError({})).toBe("unknown error");
    expect(describeError({ name: "WeirdError" })).toBe("WeirdError");
  });
});

describe("errorCode and isSchemaError", () => {
  it("reads the code off whatever carries one", () => {
    expect(errorCode(new FakePostgrestError("x", "PGRST205"))).toBe("PGRST205");
    expect(errorCode({ code: "42703" })).toBe("42703");
    expect(errorCode(new Error("no code here"))).toBeNull();
    expect(errorCode("just a string")).toBeNull();
  });

  it("separates a pending migration from anything the person did", () => {
    for (const code of ["PGRST205", "42P01", "PGRST204", "42703"]) {
      expect(isSchemaError({ code })).toBe(true);
    }
    for (const code of ["42501", "23505", "PGRST301"]) {
      expect(isSchemaError({ code })).toBe(false);
    }
    expect(isSchemaError(new Error("network"))).toBe(false);
  });
});

describe("friendlyError", () => {
  it("explains a missing table without blaming the reader", () => {
    const err = new FakePostgrestError("Could not find the table", "PGRST205");
    expect(friendlyError(err)).toBe("This feature isn't set up on the database yet.");
  });

  it("distinguishes a missing column, a denial and a duplicate", () => {
    expect(friendlyError({ code: "42703" })).toBe("The database is missing a field this needs.");
    expect(friendlyError({ code: "42501" })).toBe("You don't have permission to do that.");
    expect(friendlyError({ code: "23505" })).toBe("That's already been saved.");
  });

  it("recognises a dropped connection from the message alone", () => {
    expect(friendlyError(new TypeError("Failed to fetch"))).toBe(
      "Couldn't reach the server — check your connection."
    );
    expect(friendlyError(new Error("Load failed"))).toBe(
      "Couldn't reach the server — check your connection."
    );
  });

  it("falls back to something calm for anything unrecognised", () => {
    expect(friendlyError(new Error("kaboom"))).toBe("Something went wrong. Please try again.");
    expect(friendlyError(undefined)).toBe("Something went wrong. Please try again.");
  });
});
