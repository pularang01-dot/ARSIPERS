"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { go, friendlyError } from "@/lib/flash";
import { inviteSchema, settingsSchema, userSchema, zodFlat } from "@/lib/validation";
import { validateNumberFormat } from "@/lib/numbering";
import { unknownPlaceholders } from "@/lib/templates";

export async function inviteUser(formData: FormData) {
  await requirePermission("users.manage");
  const parsed = inviteSchema.safeParse({ email: formData.get("email"), full_name: formData.get("full_name"), role: formData.get("role") });
  if (!parsed.success) go("/pengguna", "error", zodFlat(parsed.error));
  const d = parsed.data!;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(d.email, { data: { full_name: d.full_name }, redirectTo: `${base}/auth/callback?next=/atur-password` });
  if (error || !data.user) go("/pengguna", "error", "Undangan gagal dikirim. Periksa alamat email atau konfigurasi email Supabase.");
  // Role ditetapkan melalui RPC ber-audit (bukan dari metadata yang dapat dimanipulasi pengguna)
  const { error: e2 } = await createClient().rpc("admin_set_user", { p_user: data!.user.id, p_full_name: d.full_name, p_role: d.role, p_active: true });
  if (e2) go("/pengguna", "error", `Akun dibuat tetapi role belum diatur: ${friendlyError(e2)}`);
  revalidatePath("/pengguna");
  go("/pengguna", "ok", "Undangan terkirim. Pengguna membuat kata sandi lewat email.");
}

export async function updateUser(formData: FormData) {
  await requirePermission("users.manage");
  const parsed = userSchema.safeParse({ id: formData.get("id"), full_name: formData.get("full_name"), role: formData.get("role"), active: formData.get("active") });
  if (!parsed.success) go("/pengguna", "error", zodFlat(parsed.error));
  const d = parsed.data!;
  const { error } = await createClient().rpc("admin_set_user", { p_user: d.id, p_full_name: d.full_name, p_role: d.role, p_active: d.active });
  if (error) go("/pengguna", "error", friendlyError(error));
  revalidatePath("/pengguna");
  go("/pengguna", "ok", "Pengguna diperbarui");
}

export async function saveSettings(formData: FormData) {
  await requirePermission("settings.manage");
  const parsed = settingsSchema.safeParse(Object.fromEntries(Array.from(formData.entries()).filter(([, v]) => typeof v === "string")));
  if (!parsed.success) go("/pengaturan", "error", zodFlat(parsed.error));
  const d = parsed.data!;
  if (d.number_format) { const e = validateNumberFormat(d.number_format); if (e) go("/pengaturan", "error", e); }
  const { error } = await createClient().from("school_settings").update(d).eq("id", 1);
  if (error) go("/pengaturan", "error", friendlyError(error));
  revalidatePath("/pengaturan");
  go("/pengaturan", "ok", "Pengaturan disimpan");
}

export async function addCategory(formData: FormData) {
  await requirePermission("settings.manage");
  const kind = String(formData.get("kind")); const code = String(formData.get("code") ?? "").trim().toUpperCase(); const name = String(formData.get("name") ?? "").trim();
  if (!["incoming", "outgoing"].includes(kind) || !/^[A-Z0-9.\-]{1,20}$/.test(code) || name.length < 2) go("/pengaturan", "error", "Kode (huruf/angka, maks 20) dan nama kategori wajib diisi");
  const { error } = await createClient().from("letter_categories").insert({ kind, code, name });
  if (error) go("/pengaturan", "error", friendlyError(error));
  revalidatePath("/pengaturan");
  go("/pengaturan", "ok", "Kategori ditambahkan");
}

export async function toggleCategory(formData: FormData) {
  await requirePermission("settings.manage");
  const { error } = await createClient().from("letter_categories").update({ is_active: String(formData.get("active")) === "true" }).eq("id", String(formData.get("id")));
  if (error) go("/pengaturan", "error", friendlyError(error));
  revalidatePath("/pengaturan");
  go("/pengaturan", "ok", "Kategori diperbarui");
}

export async function saveTemplate(formData: FormData) {
  await requirePermission("settings.manage");
  const id = String(formData.get("id") ?? ""); const name = String(formData.get("name") ?? "").trim(); const body = String(formData.get("body") ?? "");
  const letter_type = String(formData.get("letter_type") ?? "UMUM").trim() || "UMUM";
  if (name.length < 2 || body.trim().length < 10) go("/pengaturan", "error", "Nama dan isi template wajib diisi");
  const bad = unknownPlaceholders(body);
  if (bad.length) go("/pengaturan", "error", `Placeholder tidak dikenal: ${bad.join(", ")}`);
  const sb = createClient();
  const { error } = id ? await sb.from("letter_templates").update({ name, body, letter_type, is_active: formData.get("active") === "on" }).eq("id", id) : await sb.from("letter_templates").insert({ name, body, letter_type });
  if (error) go("/pengaturan", "error", friendlyError(error));
  revalidatePath("/pengaturan");
  go("/pengaturan", "ok", "Template disimpan");
}
