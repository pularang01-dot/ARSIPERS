"use server";
import { createClient } from "@/lib/supabase/server";
import { go } from "@/lib/flash";
import { safeNext } from "@/lib/utils";
import { redirect } from "next/navigation";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));
  if (!email || !password) go("/login", "error", "Email dan kata sandi wajib diisi");
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) go("/login", "error", "Email atau kata sandi salah");
  const { data: profile } = await supabase.from("profiles").select("is_active").eq("id", data!.user.id).maybeSingle();
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    go("/login", "error", "Akun Anda tidak aktif. Hubungi administrator.");
  }
  await supabase.rpc("log_auth_event", { p_action: "AUTH_LOGIN" });
  redirect(next);
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(String(formData.get("next") ?? ""));
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { data, error } = await createClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}`, queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) go("/login", "error", "Masuk dengan Google belum dapat dimulai. Hubungi administrator.");
  redirect(data.url);
}

export async function signOut() {
  const supabase = createClient();
  await supabase.rpc("log_auth_event", { p_action: "AUTH_LOGOUT" });
  await supabase.auth.signOut();
  redirect("/login?ok=" + encodeURIComponent("Anda telah keluar"));
}