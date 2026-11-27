import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, type Permission } from "@/lib/permissions";

export type Session = {
  userId: string;
  email: string;
  fullName: string;
  roleCode: string;
  permissions: string[];
};

/** Sesi + izin dibaca dari database (bukan dari klien). Dicache per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = createClient();
  let user: { id: string; email?: string | null } | null = null;
  try {
    const r = await supabase.auth.getUser();
    user = r.data.user;
  } catch {
    return null; // sesi rusak: perlakukan sebagai belum login
  }
  if (!user) return null;
  // Satu permintaan: profil + daftar izin role (sebelumnya dua permintaan berurutan)
  const { data: profile } = await supabase.from("profiles")
    .select("full_name, role_code, is_active, role:roles(role_permissions(permission_code))")
    .eq("id", user.id).maybeSingle();
  if (!profile || !profile.is_active) return null;
  const rel = (profile as Record<string, unknown>).role;
  const relObj = (Array.isArray(rel) ? rel[0] : rel) as { role_permissions?: { permission_code: string }[] } | null | undefined;
  let permissions = (relObj?.role_permissions ?? []).map((r) => r.permission_code);
  if (!permissions.length) {
    // cadangan bila relasi bersarang tidak terbaca
    const { data: rp } = await supabase.from("role_permissions").select("permission_code").eq("role_code", profile.role_code);
    permissions = (rp ?? []).map((r: { permission_code: string }) => r.permission_code);
  }
  return {
    userId: user.id,
    email: user.email ?? "",
    fullName: profile.full_name || user.email || "Pengguna",
    roleCode: profile.role_code,
    permissions,
  };
});

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login?error=sesi");
  return s;
}

/** Guard server-side. Pengguna tanpa izin diarahkan ke halaman akses ditolak. */
export async function requirePermission(...any: Permission[]): Promise<Session> {
  const s = await requireSession();
  if (!any.some((p) => can(s.permissions, p))) redirect("/akses-ditolak");
  return s;
}