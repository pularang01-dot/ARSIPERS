import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";
import { verifyActiveProfile } from "@/lib/auth-flow";

const ALLOWED: EmailOtpType[] = ["invite", "recovery"];
const fail = (origin: string, msg: string) => NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);

/** Tautan dari email undangan/reset: memakai token_hash sehingga berfungsi walau email dibuka di perangkat lain. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next") || "/atur-password");

  if (!tokenHash || !type || !ALLOWED.includes(type)) return fail(origin, "Tautan tidak valid. Minta undangan atau tautan baru kepada administrator.");

  const sb = createClient();
  const { error } = await sb.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return fail(origin, "Tautan sudah digunakan atau kedaluwarsa. Minta tautan baru.");

  const check = await verifyActiveProfile(sb);
  if (!check.ok) return fail(origin, check.reason);
  return NextResponse.redirect(`${origin}${next}`);
}