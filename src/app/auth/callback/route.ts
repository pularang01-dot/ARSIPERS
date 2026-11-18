import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";
import { GOOGLE_FAIL, verifyActiveProfile } from "@/lib/auth-flow";

const fail = (origin: string, msg: string) => NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);

/** Tujuan balik OAuth (Google) dan alur kode PKCE. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get("next"));
  if (searchParams.get("error") || searchParams.get("error_description")) return fail(origin, GOOGLE_FAIL);

  const code = searchParams.get("code");
  if (!code) return fail(origin, "Tautan tidak valid atau kedaluwarsa");

  const sb = createClient();
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) return fail(origin, GOOGLE_FAIL);

  const check = await verifyActiveProfile(sb);
  if (!check.ok) return fail(origin, check.reason);

  if (next !== "/atur-password") await sb.rpc("log_auth_event", { p_action: "AUTH_LOGIN_GOOGLE" });
  return NextResponse.redirect(`${origin}${next}`);
}