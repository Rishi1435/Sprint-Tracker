import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { siteOrigin } from "@/lib/auth";

/**
 * `siteOrigin` decides the address that goes out in a sign-in email, so a wrong
 * answer here mails a link nobody can open. The env vars are read inside the
 * function rather than at module scope, which is what lets these tests swap them.
 */

const KEYS = ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL"] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("siteOrigin", () => {
  it("uses NEXT_PUBLIC_SITE_URL when set", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://sprint-tracker-roan.vercel.app";
    expect(siteOrigin()).toBe("https://sprint-tracker-roan.vercel.app");
  });

  it("prefers NEXT_PUBLIC_SITE_URL over the Vercel domain", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://sprint.example.com";
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL = "sprint-tracker-roan.vercel.app";
    expect(siteOrigin()).toBe("https://sprint.example.com");
  });

  it("falls back to the Vercel production domain, which carries no scheme", () => {
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL = "sprint-tracker-roan.vercel.app";
    expect(siteOrigin()).toBe("https://sprint-tracker-roan.vercel.app");
  });

  it("drops a trailing slash so the callback path doesn't double up", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://sprint-tracker-roan.vercel.app///";
    expect(`${siteOrigin()}/auth/callback`).toBe(
      "https://sprint-tracker-roan.vercel.app/auth/callback"
    );
  });

  it("keeps an explicit http scheme, so a self-hosted origin isn't forced to https", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://sprint.local:8080";
    expect(siteOrigin()).toBe("http://sprint.local:8080");
  });

  it("ignores a blank value rather than returning an empty origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "   ";
    // No window in the node test environment, so nothing is left to fall back to.
    expect(siteOrigin()).toBeUndefined();
  });

  it("returns undefined off the browser with nothing configured", () => {
    expect(siteOrigin()).toBeUndefined();
  });
});
