// Supabase Auth magic-link callback. Exchanges the OTP code in the URL for a
// session, then redirects the user back to the dashboard.

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const origin = url.origin;

  if (code) {
    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch (err) {
      console.warn("auth.exchangeCodeForSession failed", err);
      return NextResponse.redirect(`${origin}/?auth_error=1`);
    }
  }
  return NextResponse.redirect(`${origin}${next}`);
}
