import "server-only";
import { createClient } from "@/lib/supabase/server";

type Sb = ReturnType<typeof createClient>;

/** Setelah sesi terbentuk (Google/undangan/reset): pastikan akun punya profil AKTIF. Jika tidak, keluarkan sesi. */
export async function verifyActiveProfile(sb: Sb): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, reason: "Sesi tidak ditemukan. Silakan coba lagi." };
  const { data: p } = await sb.from("profiles").select("is_active").eq("id", user.id).maybeSingle();
  if (!p || !p.is_active) {
    await sb.auth.signOut();
    return { ok: false, reason: "Akun ini belum diaktifkan oleh administrator sekolah. Hubungi administrator untuk mendapat undangan." };
  }
  return { ok: true };
}

export const GOOGLE_FAIL = "Masuk dengan Google gagal. Gunakan akun Google dengan alamat email yang diundang administrator sekolah.";