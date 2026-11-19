"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { go, friendlyError } from "@/lib/flash";

/** Batalkan pengarsipan (koreksi kesalahan): surat kembali ke status sebelum arsip. */
export async function unarchiveLetter(formData: FormData) {
  await requirePermission("archives.manage");
  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const detail = kind === "incoming" ? `/surat-masuk/${id}` : `/surat-keluar/${id}`;
  const back = String(formData.get("back") ?? "") === "detail" ? detail : "/arsip";
  if (!["incoming", "outgoing"].includes(kind) || !/^[0-9a-f-]{36}$/i.test(id)) go("/arsip", "error", "Data tidak valid");
  if (reason.length < 5) go(back, "error", "Alasan pembatalan arsip wajib diisi (minimal 5 karakter)");
  const { error } = await createClient().rpc("unarchive_letter", { p_kind: kind, p_id: id, p_reason: reason });
  if (error) go(back, "error", friendlyError(error));
  revalidatePath("/arsip");
  revalidatePath(detail);
  go(back, "ok", `Pengarsipan dibatalkan. Surat dikembalikan ke status ${kind === "incoming" ? "Selesai" : "Dikirim"}.`);
}

/** Hapus surat arsip (soft delete). Hanya izin archives.delete; wajib ketik HAPUS dan alasan. */
export async function deleteArchived(formData: FormData) {
  await requirePermission("archives.delete");
  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("delete_reason") ?? "").trim();
  if (!["incoming", "outgoing"].includes(kind) || !/^[0-9a-f-]{36}$/i.test(id)) go("/arsip", "error", "Data tidak valid");
  if (String(formData.get("confirm") ?? "").trim() !== "HAPUS") go("/arsip", "error", "Penghapusan dibatalkan: ketik HAPUS (huruf besar) untuk konfirmasi");
  if (reason.length < 5) go("/arsip", "error", "Alasan penghapusan arsip wajib diisi (minimal 5 karakter)");
  const { error } = await createClient().rpc("delete_archived_letter", { p_kind: kind, p_id: id, p_reason: reason });
  if (error) go("/arsip", "error", friendlyError(error));
  revalidatePath("/arsip");
  revalidatePath(kind === "incoming" ? "/surat-masuk" : "/surat-keluar");
  go("/arsip", "ok", "Arsip dihapus. Surat tidak lagi tampil di daftar mana pun; penghapusan tercatat di audit log.");
}