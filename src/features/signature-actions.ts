"use server";
import { revalidatePath } from "next/cache";
import { requirePermission, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { go, friendlyError } from "@/lib/flash";
import { sniffMime } from "@/lib/upload";

const PAGE = "/pengaturan/penandatangan";
const UUID = /^[0-9a-f-]{36}$/i;
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Baca gambar tanda tangan (PNG/JPG, maks. 300 KB) menjadi base64. Mengembalikan pesan galat bila tidak sah. */
async function readImage(file: FormDataEntryValue | null): Promise<{ data: string; mime: string } | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih gambar tanda tangan terlebih dahulu." };
  if (file.size > 300 * 1024) return { error: "Gambar terlalu besar (maksimal 300 KB). Perkecil gambarnya." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes.subarray(0, 16));
  if (mime !== "image/png" && mime !== "image/jpeg") return { error: "Gambar tanda tangan harus berupa PNG atau JPG." };
  return { data: Buffer.from(bytes).toString("base64"), mime };
}

export async function createSignatory(formData: FormData) {
  await requirePermission("signatures.manage");
  const profile = str(formData, "profile_id");
  if (!UUID.test(profile)) go(PAGE, "error", "Pilih akun penandatangan.");
  const img = await readImage(formData.get("image"));
  if ("error" in img) go(PAGE, "error", img.error);
  const sb = createClient();
  const { data: id, error } = await sb.rpc("create_signatory", {
    p_profile: profile, p_full_name: str(formData, "full_name"), p_nip: str(formData, "nip") || null, p_position: str(formData, "position") || null,
    p_valid_from: str(formData, "valid_from") || null, p_valid_until: str(formData, "valid_until") || null,
  });
  if (error || !id) go(PAGE, "error", friendlyError(error));
  const { error: e2 } = await sb.rpc("add_signature_image", { p_signatory: id, p_data: (img as { data: string }).data, p_mime: (img as { mime: string }).mime });
  if (e2) go(PAGE, "error", `Penandatangan dibuat tetapi gambar gagal disimpan: ${friendlyError(e2)} Unggah ulang lewat tombol Ganti gambar.`);
  revalidatePath(PAGE);
  go(PAGE, "ok", "Penandatangan didaftarkan. Pemilik akun kini dapat membubuhkan tanda tangan digital saat menyetujui surat.");
}

export async function replaceSignatureImage(formData: FormData) {
  await requirePermission("signatures.manage");
  const id = str(formData, "id");
  if (!UUID.test(id)) go(PAGE, "error", "Data tidak valid.");
  const img = await readImage(formData.get("image"));
  if ("error" in img) go(PAGE, "error", img.error);
  const { error } = await createClient().rpc("add_signature_image", { p_signatory: id, p_data: (img as { data: string }).data, p_mime: (img as { mime: string }).mime });
  if (error) go(PAGE, "error", friendlyError(error));
  revalidatePath(PAGE);
  go(PAGE, "ok", "Gambar tanda tangan diganti. Surat yang sudah ditandatangani tetap memakai gambar lamanya; surat baru memakai gambar ini.");
}

export async function endSignatory(formData: FormData) {
  await requirePermission("signatures.manage");
  const id = str(formData, "id");
  if (!UUID.test(id)) go(PAGE, "error", "Data tidak valid.");
  const { error } = await createClient().rpc("end_signatory", { p_id: id, p_until: str(formData, "until") || null, p_reason: str(formData, "reason") });
  if (error) go(PAGE, "error", friendlyError(error));
  revalidatePath(PAGE);
  go(PAGE, "ok", "Masa jabatan diakhiri. Tanda tangan ini tidak dapat dipakai lagi; surat yang sah pada masanya tetap sah.");
}

export async function revokeSignatory(formData: FormData) {
  await requirePermission("signatures.manage");
  const id = str(formData, "id");
  if (!UUID.test(id)) go(PAGE, "error", "Data tidak valid.");
  if (str(formData, "confirm") !== "CABUT") go(PAGE, "error", "Pencabutan dibatalkan: ketik CABUT (huruf besar) untuk konfirmasi.");
  const { data, error } = await createClient().rpc("revoke_signatory", { p_id: id, p_reason: str(formData, "reason"), p_withdraw_all: formData.get("withdraw_all") === "on" });
  if (error) go(PAGE, "error", friendlyError(error));
  revalidatePath(PAGE);
  go(PAGE, "ok", `Penandatangan dicabut.${Number(data) > 0 ? ` ${data} tanda tangan pada surat ikut ditarik.` : ""}`);
}

/** Tarik tanda tangan digital pada satu surat (mis. salah bubuh atau disalahgunakan). */
export async function withdrawLetterSignature(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  const back = UUID.test(id) ? `/surat-keluar/${id}` : "/surat-keluar";
  if (!UUID.test(id)) go(back, "error", "Data tidak valid.");
  const { error } = await createClient().rpc("withdraw_letter_signature", { p_letter: id, p_reason: str(formData, "reason") });
  if (error) go(back, "error", friendlyError(error));
  revalidatePath(back);
  go(back, "ok", "Tanda tangan digital pada surat ini ditarik. PDF berikutnya tidak lagi memuat tanda tangan tersebut.");
}