"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { go, friendlyError } from "@/lib/flash";
import { incomingSchema, dispositionSchema, zodFlat } from "@/lib/validation";
import { saveAttachment } from "@/features/attachments";

const fd = (f: FormData) => Object.fromEntries(Array.from(f.entries()).filter(([, v]) => typeof v === "string"));

export async function createIncoming(formData: FormData) {
  const s = await requirePermission("letters.incoming.create");
  const parsed = incomingSchema.safeParse(fd(formData));
  if (!parsed.success) go("/surat-masuk/baru", "error", zodFlat(parsed.error));
  const d = parsed.data!;
  const sb = createClient();
  const { data, error } = await sb.from("incoming_letters").insert({
    ...d, is_confidential: d.nature === "RAHASIA", status: "DICATAT", received_by: s.userId, created_by: s.userId,
  }).select("id").single();
  if (error || !data) go("/surat-masuk/baru", "error", friendlyError(error));
  const file = formData.get("file");
  let warn = "";
  if (file instanceof File && file.size > 0) {
    const e = await saveAttachment("incoming", data!.id, s.userId, file);
    if (e) warn = ` Lampiran tidak tersimpan: ${e}`;
  }
  revalidatePath("/surat-masuk");
  go(`/surat-masuk/${data!.id}`, warn ? "error" : "ok", warn ? `Surat tersimpan.${warn}` : "Surat masuk berhasil dicatat");
}

export async function updateIncoming(formData: FormData) {
  await requirePermission("letters.incoming.update");
  const id = String(formData.get("id") ?? "");
  const parsed = incomingSchema.safeParse(fd(formData));
  if (!parsed.success) go(`/surat-masuk/${id}/ubah`, "error", zodFlat(parsed.error));
  const d = parsed.data!;
  const { error } = await createClient().from("incoming_letters").update({ ...d, is_confidential: d.nature === "RAHASIA" }).eq("id", id);
  if (error) go(`/surat-masuk/${id}/ubah`, "error", friendlyError(error));
  revalidatePath(`/surat-masuk/${id}`);
  go(`/surat-masuk/${id}`, "ok", "Perubahan disimpan");
}

export async function advanceIncoming(formData: FormData) {
  await requirePermission("letters.incoming.update");
  const id = String(formData.get("id") ?? "");
  const { error } = await createClient().rpc("transition_incoming", { p_id: id, p_to: String(formData.get("to") ?? ""), p_note: String(formData.get("note") ?? "") || null });
  if (error) go(`/surat-masuk/${id}`, "error", friendlyError(error));
  revalidatePath(`/surat-masuk/${id}`);
  go(`/surat-masuk/${id}`, "ok", "Status surat diperbarui");
}

export async function addIncomingAttachment(formData: FormData) {
  const s = await requirePermission("letters.incoming.update");
  const id = String(formData.get("id") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) go(`/surat-masuk/${id}`, "error", "Pilih berkas terlebih dahulu");
  const e = await saveAttachment("incoming", id, s.userId, file as File);
  if (e) go(`/surat-masuk/${id}`, "error", e);
  revalidatePath(`/surat-masuk/${id}`);
  go(`/surat-masuk/${id}`, "ok", "Lampiran ditambahkan");
}

export async function deleteIncoming(formData: FormData) {
  await requirePermission("letters.incoming.delete");
  const id = String(formData.get("id") ?? "");
  const { error } = await createClient().rpc("delete_letter", { p_kind: "incoming", p_id: id, p_reason: String(formData.get("reason") ?? "") });
  if (error) go(`/surat-masuk/${id}`, "error", friendlyError(error));
  revalidatePath("/surat-masuk");
  go("/surat-masuk", "ok", "Surat dihapus (arsip internal tetap tercatat di audit log)");
}

export async function archiveIncoming(formData: FormData) {
  await requirePermission("archives.manage");
  const id = String(formData.get("id") ?? "");
  const { error } = await createClient().rpc("archive_letter", { p_kind: "incoming", p_id: id, p_note: String(formData.get("note") ?? "") || null });
  if (error) go(`/surat-masuk/${id}`, "error", friendlyError(error));
  revalidatePath("/arsip");
  go(`/surat-masuk/${id}`, "ok", "Surat diarsipkan");
}

export async function createDisposition(formData: FormData) {
  await requirePermission("letters.disposition.create");
  const incoming_id = String(formData.get("incoming_id") ?? "");
  const parsed = dispositionSchema.safeParse({
    incoming_id, assignees: formData.getAll("assignees").map(String), instruction: formData.get("instruction") ?? "",
    priority: formData.get("priority") ?? "NORMAL", due_date: formData.get("due_date") ?? "",
  });
  if (!parsed.success) go(`/surat-masuk/${incoming_id}`, "error", zodFlat(parsed.error));
  const d = parsed.data!;
  const { error } = await createClient().rpc("create_disposition", { p_incoming: d.incoming_id, p_assignees: d.assignees, p_instruction: d.instruction, p_priority: d.priority, p_due: d.due_date });
  if (error) go(`/surat-masuk/${incoming_id}`, "error", friendlyError(error));
  revalidatePath(`/surat-masuk/${incoming_id}`);
  go(`/surat-masuk/${incoming_id}`, "ok", "Disposisi dikirim");
}
