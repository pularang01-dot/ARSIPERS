import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateUpload } from "@/lib/upload";
import { friendlyError } from "@/lib/flash";
import { safeFileName } from "@/lib/utils";

/** Unggah ke bucket privat + catat metadata. Mengembalikan pesan galat atau null bila berhasil. */
export async function saveAttachment(kind: "incoming" | "outgoing", letterId: string, userId: string, file: File): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const buf = new Uint8Array(await file.arrayBuffer());
  const check = validateUpload(file.name, file.size, buf.subarray(0, 16));
  if (!check.ok) return check.error;

  const sb = createClient();
  const path = `${kind}/${letterId}/${randomUUID()}.${check.ext}`;
  const up = await sb.storage.from("letter-files").upload(path, buf, { contentType: check.mime, upsert: false });
  if (up.error) return "Berkas gagal diunggah. Periksa izin dan koneksi Anda.";

  const { error } = await sb.from("letter_attachments").insert({
    incoming_letter_id: kind === "incoming" ? letterId : null,
    outgoing_letter_id: kind === "outgoing" ? letterId : null,
    storage_path: path, file_name: safeFileName(file.name), mime_type: check.mime, size_bytes: file.size, uploaded_by: userId,
  });
  if (error) {
    // Bersihkan berkas yatim (klien tidak punya hak hapus; gunakan service role di server)
    try { await createAdminClient().storage.from("letter-files").remove([path]); } catch { /* dicatat di dokumentasi operasional */ }
    return friendlyError(error);
  }
  return null;
}
