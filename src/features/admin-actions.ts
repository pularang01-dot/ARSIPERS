"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { go, friendlyError } from "@/lib/flash";
import { inviteSchema, settingsSchema, userSchema, zodFlat } from "@/lib/validation";
import { normalizeNumberFormat, validateNumberFormat } from "@/lib/numbering";
import { categoryCodeFromName, normalizeCategoryCode } from "@/lib/categories";
import { sniffMime } from "@/lib/upload";
import { unknownPlaceholders } from "@/lib/templates";

export async function inviteUser(formData: FormData) {
  await requirePermission("users.manage");
  const parsed = inviteSchema.safeParse({ email: formData.get("email"), full_name: formData.get("full_name"), role: formData.get("role") });
  if (!parsed.success) go("/pengguna", "error", zodFlat(parsed.error));
  const d = parsed.data!;
  const mode = String(formData.get("mode")) === "google" ? "google" : "email";
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const admin = createAdminClient();

  let userId: string;
  if (mode === "email") {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(d.email, { data: { full_name: d.full_name }, redirectTo: `${base}/auth/confirm` });
    if (error || !data.user) go("/pengguna", "error", "Undangan gagal dikirim. Email mungkin sudah terdaftar, atau konfigurasi email Supabase belum benar.");
    userId = data!.user.id;
  } else {
    // Daftar tanpa kirim email: untuk pengguna yang masuk lewat Google. Email dianggap terverifikasi oleh admin.
    const { data, error } = await admin.auth.admin.createUser({ email: d.email, email_confirm: true, user_metadata: { full_name: d.full_name } });
    if (error || !data.user) go("/pengguna", "error", "Pendaftaran gagal. Email mungkin sudah terdaftar.");
    userId = data!.user.id;
  }
  // Role ditetapkan melalui RPC ber-audit (bukan dari metadata yang dapat dimanipulasi pengguna)
  const { error: e2 } = await createClient().rpc("admin_set_user", { p_user: userId, p_full_name: d.full_name, p_role: d.role, p_active: true });
  if (e2) go("/pengguna", "error", `Akun dibuat tetapi role belum diatur: ${friendlyError(e2)}`);
  revalidatePath("/pengguna");
  go("/pengguna", "ok", mode === "email"
    ? "Undangan terkirim. Pengguna membuat kata sandi lewat email, atau boleh langsung masuk dengan Google."
    : "Pengguna didaftarkan. Minta pengguna memilih Masuk dengan Google memakai email yang sama.");
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
  if (!parsed.success) go("/pengaturan#pesan", "error", zodFlat(parsed.error));
  const d = parsed.data!;
  if (d.number_format) {
    d.number_format = normalizeNumberFormat(d.number_format);
    const e = validateNumberFormat(d.number_format);
    if (e) go("/pengaturan#pesan", "error", `Format nomor surat belum benar. ${e}`);
  }
  // Logo kop: PNG atau JPG maksimal 300 KB (disimpan sebagai teks base64 di database)
  const update: Record<string, unknown> = { ...d };
  const logo = formData.get("logo");
  if (formData.get("remove_logo") === "on") { update.logo_data = null; update.logo_mime = null; }
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > 300 * 1024) go("/pengaturan#pesan", "error", "Logo terlalu besar (maksimal 300 KB). Perkecil gambarnya, misalnya ke lebar 400 piksel.");
    const bytes = new Uint8Array(await logo.arrayBuffer());
    const mime = sniffMime(bytes.subarray(0, 16));
    if (mime !== "image/png" && mime !== "image/jpeg") go("/pengaturan#pesan", "error", "Logo harus berupa gambar PNG atau JPG.");
    update.logo_data = Buffer.from(bytes).toString("base64");
    update.logo_mime = mime;
  }
  const { error } = await createClient().from("school_settings").update(update).eq("id", 1);
  if (error) go("/pengaturan#pesan", "error", friendlyError(error));
  revalidatePath("/pengaturan");
  go("/pengaturan#pesan", "ok", "Pengaturan disimpan");
}

export async function addCategory(formData: FormData) {
  await requirePermission("settings.manage");
  const kind = String(formData.get("kind") ?? "");
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (!["incoming", "outgoing"].includes(kind)) go("/pengaturan#pesan", "error", "Pilih jenis kategori: surat masuk atau surat keluar");
  if (name.length < 2) go("/pengaturan#pesan", "error", "Nama kategori wajib diisi (minimal 2 huruf)");
  if (name.length > 80) go("/pengaturan#pesan", "error", "Nama kategori terlalu panjang (maksimal 80 karakter)");
  // Kode boleh dikosongkan: dibuat otomatis dari nama. Kode manual dirapikan (spasi menjadi strip).
  const typed = normalizeCategoryCode(String(formData.get("code") ?? ""));
  const code = typed || categoryCodeFromName(name);
  if (!code) go("/pengaturan#pesan", "error", "Nama kategori harus memuat huruf atau angka");
  const sb = createClient();
  const { data: dup } = await sb.from("letter_categories").select("id, name").eq("kind", kind).eq("code", code).maybeSingle();
  if (dup) go("/pengaturan#pesan", "error", `Kode "${code}" sudah dipakai oleh kategori "${dup.name}". Ubah nama atau isi kolom kode yang berbeda.`);
  const { error } = await sb.from("letter_categories").insert({ kind, code, name });
  if (error) go("/pengaturan#pesan", "error", friendlyError(error));
  revalidatePath("/pengaturan");
  go("/pengaturan#pesan", "ok", `Kategori "${name}" ditambahkan untuk ${kind === "incoming" ? "surat masuk" : "surat keluar"} (kode ${code}).`);
}

export async function toggleCategory(formData: FormData) {
  await requirePermission("settings.manage");
  const { error } = await createClient().from("letter_categories").update({ is_active: String(formData.get("active")) === "true" }).eq("id", String(formData.get("id")));
  if (error) go("/pengaturan#pesan", "error", friendlyError(error));
  revalidatePath("/pengaturan");
  go("/pengaturan#pesan", "ok", "Kategori diperbarui");
}

export async function saveTemplate(formData: FormData) {
  await requirePermission("settings.manage");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const body = String(formData.get("body") ?? "");
  const letter_type = String(formData.get("letter_type") ?? "UMUM").trim() || "UMUM";
  const back = id ? `/pengaturan/template/${id}` : "/pengaturan/template/baru";
  if (!/^[0-9a-f-]{36}$/i.test(id) && id) go("/pengaturan/template", "error", "Template tidak valid");
  if (name.length < 2) go(back, "error", "Nama template wajib diisi (minimal 2 huruf)");
  if (body.trim().length < 10) go(back, "error", "Isi template terlalu pendek. Tulis isi surat atau pilih salah satu contoh.");
  const bad = unknownPlaceholders(body);
  if (bad.length) go(back, "error", `Isian tidak dikenal: ${bad.map((x) => `{{${x}}}`).join(", ")}. Gunakan tombol Sisipkan di penyunting.`);
  const sb = createClient();
  const { error } = id
    ? await sb.from("letter_templates").update({ name, body, letter_type, is_active: formData.get("active") === "on" }).eq("id", id)
    : await sb.from("letter_templates").insert({ name, body, letter_type });
  if (error) go(back, "error", friendlyError(error));
  revalidatePath("/pengaturan/template");
  go("/pengaturan/template", "ok", id ? `Template "${name}" diperbarui.` : `Template "${name}" dibuat. Sekarang bisa dipilih saat membuat surat keluar.`);
}

/** Kirim ulang undangan. Pengguna yang belum pernah menerima/menerima undangan: undangan baru.
 *  Pengguna yang sudah terverifikasi (sudah masuk, atau didaftarkan tanpa email): tautan buat/atur ulang kata sandi. */
export async function resendInvite(formData: FormData) {
  const s = await requirePermission("users.manage");
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) go("/pengguna", "error", "ID pengguna tidak valid");
  if (id === s.userId) go("/pengguna", "error", "Untuk akun Anda sendiri, gunakan Lupa kata sandi di halaman masuk");

  const sb = createClient();
  const { data: prof } = await sb.from("profiles").select("is_active").eq("id", id).maybeSingle();
  if (!prof) go("/pengguna", "error", "Pengguna tidak ditemukan");
  if (!prof!.is_active) go("/pengguna", "error", "Aktifkan pengguna terlebih dahulu sebelum mengirim undangan");

  const admin = createAdminClient();
  const { data: u, error } = await admin.auth.admin.getUserById(id);
  const email = u?.user?.email;
  if (error || !email || !u?.user) go("/pengguna", "error", "Email pengguna tidak ditemukan");
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectTo = `${base}/auth/confirm`;

  const neverAccepted = !u!.user.last_sign_in_at && !u!.user.email_confirmed_at;
  let kind: "invite" | "reset" = "reset";
  if (neverAccepted) {
    const { error: e } = await admin.auth.admin.inviteUserByEmail(email!, { redirectTo });
    if (!e) kind = "invite";
  }
  if (kind === "reset") {
    const { error: e } = await admin.auth.resetPasswordForEmail(email!, { redirectTo });
    if (e) go("/pengguna", "error", "Email gagal dikirim. Periksa batas pengiriman email dan konfigurasi SMTP Brevo di Supabase.");
  }
  await sb.rpc("log_admin_event", { p_action: "USER_INVITE_RESEND", p_target: id, p_meta: { email } });
  go("/pengguna", "ok", kind === "invite"
    ? `Undangan dikirim ulang ke ${email}.`
    : `Pengguna ini sudah terverifikasi, jadi dikirim tautan membuat/mengatur ulang kata sandi ke ${email}. Pengguna juga dapat langsung memakai Masuk dengan Google.`);
}

/** Hapus permanen akun pengguna. Hanya untuk akun TANPA riwayat; selain itu gunakan Nonaktifkan. */
export async function deleteUser(formData: FormData) {
  const s = await requirePermission("users.manage");
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) go("/pengguna", "error", "ID pengguna tidak valid");
  if (id === s.userId) go("/pengguna", "error", "Anda tidak dapat menghapus akun Anda sendiri");
  if (String(formData.get("confirm") ?? "").trim() !== "HAPUS") go("/pengguna", "error", "Penghapusan dibatalkan: ketik HAPUS (huruf besar) untuk konfirmasi");

  const sb = createClient();
  const { data: prof } = await sb.from("profiles").select("full_name, role_code, is_active").eq("id", id).maybeSingle();
  if (!prof) go("/pengguna", "error", "Pengguna tidak ditemukan");

  if (prof!.role_code === "SUPER_ADMIN") {
    const { count } = await sb.from("profiles").select("id", { count: "exact", head: true }).eq("role_code", "SUPER_ADMIN").eq("is_active", true).neq("id", id);
    if (!count) go("/pengguna", "error", "Tidak dapat menghapus Super Admin aktif terakhir");
  }

  const { data: hasRecords, error: e0 } = await sb.rpc("user_has_records", { p_user: id });
  if (e0) go("/pengguna", "error", friendlyError(e0));
  if (hasRecords) go("/pengguna", "error", "Akun ini memiliki riwayat (surat, disposisi, persetujuan, atau lampiran) sehingga tidak dapat dihapus agar jejak audit tetap utuh. Gunakan Nonaktifkan.");

  const admin = createAdminClient();
  const { data: u } = await admin.auth.admin.getUserById(id);
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) go("/pengguna", "error", "Penghapusan gagal. Akun mungkin masih memiliki data terkait; gunakan Nonaktifkan.");

  await sb.rpc("log_admin_event", { p_action: "USER_DELETE", p_target: id, p_meta: { email: u?.user?.email ?? null, name: prof!.full_name, role: prof!.role_code } });
  revalidatePath("/pengguna");
  go("/pengguna", "ok", `Akun ${prof!.full_name || u?.user?.email || "pengguna"} dihapus permanen.`);
}