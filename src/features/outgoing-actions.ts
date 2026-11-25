"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { go, friendlyError } from "@/lib/flash";
import { outgoingSchema, zodFlat } from "@/lib/validation";
import { saveAttachment } from "@/features/attachments";
import { renderTemplate } from "@/lib/templates";
import { formatDate } from "@/lib/utils";
import { hasUnfilled } from "@/lib/letterhead";

const fd = (f: FormData) => Object.fromEntries(Array.from(f.entries()).filter(([, v]) => typeof v === "string"));
const str = (f: FormData, k: string) => String(f.get(k) ?? "");

export async function createOutgoing(formData: FormData) {
  const s = await requirePermission("letters.outgoing.create");
  const parsed = outgoingSchema.safeParse(fd(formData));
  if (!parsed.success) go("/surat-keluar/baru", "error", zodFlat(parsed.error));
  const d = parsed.data!;
  const sb = createClient();
  let body = d.body;
  if (!body.trim() && d.template_id) {
    const { data: t } = await sb.from("letter_templates").select("body").eq("id", d.template_id).eq("is_active", true).maybeSingle();
    const { data: st } = await sb.from("school_settings").select("name, principal_name, principal_nip").eq("id", 1).maybeSingle();
    if (t) body = renderTemplate(t.body, { recipient: d.recipient, subject: d.subject, date: formatDate(d.letter_date), school_name: st?.name, principal_name: st?.principal_name, principal_nip: st?.principal_nip });
  }
  const { data, error } = await sb.from("outgoing_letters").insert({ ...d, body, is_confidential: d.nature === "RAHASIA", created_by: s.userId, status: "DRAFT", version: 1 }).select("id").single();
  if (error || !data) go("/surat-keluar/baru", "error", friendlyError(error));
  const file = formData.get("file");
  let warn = "";
  if (file instanceof File && file.size > 0) { const e = await saveAttachment("outgoing", data!.id, s.userId, file); if (e) warn = ` Lampiran tidak tersimpan: ${e}`; }
  revalidatePath("/surat-keluar");
  go(`/surat-keluar/${data!.id}`, warn ? "error" : "ok", warn ? `Draft tersimpan.${warn}` : "Draft surat disimpan");
}

export async function updateOutgoing(formData: FormData) {
  await requirePermission("letters.outgoing.create", "letters.outgoing.update");
  const id = str(formData, "id");
  const parsed = outgoingSchema.safeParse(fd(formData));
  if (!parsed.success) go(`/surat-keluar/${id}/ubah`, "error", zodFlat(parsed.error));
  const d = parsed.data!;
  const { error, data } = await createClient().from("outgoing_letters").update({ ...d, is_confidential: d.nature === "RAHASIA" }).eq("id", id).select("id");
  if (error) go(`/surat-keluar/${id}/ubah`, "error", friendlyError(error));
  if (!data?.length) go(`/surat-keluar/${id}`, "error", "Surat tidak dapat diubah pada status ini");
  revalidatePath(`/surat-keluar/${id}`);
  go(`/surat-keluar/${id}`, "ok", "Perubahan disimpan");
}

const ACTION_MSG: Record<string, string> = { SUBMIT: "Surat diajukan untuk pemeriksaan", REVIEW: "Surat mulai ditinjau", REQUEST_REVISION: "Permintaan revisi dikirim", APPROVE: "Surat disetujui" };
export async function transitionOutgoing(formData: FormData) {
  await requirePermission("letters.outgoing.submit", "letters.outgoing.approve");
  const id = str(formData, "id"); const action = str(formData, "action");
  if (!ACTION_MSG[action]) go(`/surat-keluar/${id}`, "error", "Aksi tidak dikenal");
  if (action === "SUBMIT") {
    const { data: l } = await createClient().from("outgoing_letters").select("body").eq("id", id).maybeSingle();
    if (l && hasUnfilled(l.body as string)) go(`/surat-keluar/${id}`, "error", "Masih ada bagian [isi ...] pada isi surat yang belum dilengkapi. Ubah draft terlebih dahulu sebelum mengajukan.");
  }
  const { error } = await createClient().rpc("transition_outgoing", { p_id: id, p_action: action, p_note: str(formData, "note") || null });
  if (error) go(`/surat-keluar/${id}`, "error", friendlyError(error));
  revalidatePath(`/surat-keluar/${id}`);
  go(`/surat-keluar/${id}`, "ok", ACTION_MSG[action]);
}

export async function finalizeOutgoing(formData: FormData) {
  await requirePermission("letters.outgoing.update");
  const id = str(formData, "id");
  const { data, error } = await createClient().rpc("finalize_outgoing_letter", { p_id: id });
  if (error) go(`/surat-keluar/${id}`, "error", friendlyError(error));
  revalidatePath(`/surat-keluar/${id}`);
  go(`/surat-keluar/${id}`, "ok", `Surat final. Nomor surat: ${data}`);
}

export async function reviseOutgoing(formData: FormData) {
  await requirePermission("letters.outgoing.update");
  const id = str(formData, "id");
  const { error } = await createClient().rpc("revise_outgoing_letter", { p_id: id, p_note: str(formData, "note") });
  if (error) go(`/surat-keluar/${id}`, "error", friendlyError(error));
  revalidatePath(`/surat-keluar/${id}`);
  go(`/surat-keluar/${id}`, "ok", "Versi baru dibuat. Ubah isi lalu ajukan kembali.");
}

export async function recordDelivery(formData: FormData) {
  await requirePermission("letters.outgoing.update");
  const id = str(formData, "id");
  const { error } = await createClient().rpc("record_delivery", { p_id: id, p_method: str(formData, "method"), p_note: str(formData, "note") || null });
  if (error) go(`/surat-keluar/${id}`, "error", friendlyError(error));
  revalidatePath(`/surat-keluar/${id}`);
  go(`/surat-keluar/${id}`, "ok", "Pengiriman dicatat");
}

export async function archiveOutgoing(formData: FormData) {
  await requirePermission("archives.manage");
  const id = str(formData, "id");
  const { error } = await createClient().rpc("archive_letter", { p_kind: "outgoing", p_id: id, p_note: str(formData, "note") || null });
  if (error) go(`/surat-keluar/${id}`, "error", friendlyError(error));
  revalidatePath("/arsip");
  go(`/surat-keluar/${id}`, "ok", "Surat diarsipkan");
}

export async function deleteOutgoing(formData: FormData) {
  await requirePermission("letters.outgoing.create", "letters.outgoing.update");
  const id = str(formData, "id");
  const { error } = await createClient().rpc("delete_letter", { p_kind: "outgoing", p_id: id, p_reason: str(formData, "reason") });
  if (error) go(`/surat-keluar/${id}`, "error", friendlyError(error));
  revalidatePath("/surat-keluar");
  go("/surat-keluar", "ok", "Draft dihapus");
}

export async function addOutgoingAttachment(formData: FormData) {
  const s = await requirePermission("letters.outgoing.create", "letters.outgoing.update");
  const id = str(formData, "id");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) go(`/surat-keluar/${id}`, "error", "Pilih berkas terlebih dahulu");
  const e = await saveAttachment("outgoing", id, s.userId, file as File);
  if (e) go(`/surat-keluar/${id}`, "error", e);
  revalidatePath(`/surat-keluar/${id}`);
  go(`/surat-keluar/${id}`, "ok", "Lampiran ditambahkan");
}