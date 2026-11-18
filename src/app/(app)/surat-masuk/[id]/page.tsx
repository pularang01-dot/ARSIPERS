import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getAssignableUsers, getAttachments, getAuditTrail, getProfileMap } from "@/lib/data";
import { Card, DefinitionList, Field, Flash, inputClass, LinkButton, PageHeader, Stepper, StatusBadge, SubmitButton, Timeline, EmptyState, tableClass } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { INCOMING_STEPS, PRIORITIES, STATUS_LABEL } from "@/lib/constants";
import { firstParam, formatBytes, formatDate, formatDateTime } from "@/lib/utils";
import { INCOMING_EDITABLE, INCOMING_TRANSITIONS } from "@/lib/workflow";
import { addIncomingAttachment, advanceIncoming, archiveIncoming, createDisposition, deleteIncoming } from "@/features/incoming-actions";
import { Paperclip } from "lucide-react";

export const metadata = { title: "Detail surat masuk" };

const NEXT_LABEL: Record<string, string> = { DICATAT: "Tandai dicatat", DIVERIFIKASI: "Verifikasi surat", MENUNGGU_DISPOSISI: "Menunggu disposisi", DITINDAKLANJUTI: "Tandai ditindaklanjuti", SELESAI: "Tandai selesai" };

export default async function Page({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | string[] | undefined> }) {
  const s = await requireSession();
  const sb = createClient();
  const { data: l } = await sb.from("incoming_letters").select("*, category:letter_categories(name)").eq("id", params.id).maybeSingle();
  if (!l) notFound(); // RLS: tidak ada izin = tidak ditemukan (tidak membocorkan keberadaan)
  const p = (x: Parameters<typeof can>[1]) => can(s.permissions, x);

  const [files, disps, assignable] = await Promise.all([
    getAttachments(sb, "incoming", l.id),
    sb.from("letter_dispositions").select("id, assigned_to, instruction, priority, due_date, status, completed_note, created_by, created_at").eq("incoming_letter_id", l.id).order("created_at", { ascending: false }),
    p("letters.disposition.create") ? getAssignableUsers(sb) : Promise.resolve([]),
  ]);
  const dispRows = (disps.data ?? []) as any[];
  const trail = p("audit_logs.view") ? await getAuditTrail(sb, "incoming_letter", l.id) : [];
  const names = await getProfileMap(sb, [l.created_by, l.received_by, ...dispRows.map((d) => d.assigned_to), ...dispRows.map((d) => d.created_by), ...trail.map((t) => t.actor_id)]);

  const nextStatuses = p("letters.incoming.update") ? (INCOMING_TRANSITIONS[l.status] ?? []) : [];
  const canDispose = p("letters.disposition.create") && ["DIVERIFIKASI", "MENUNGGU_DISPOSISI", "DITINDAKLANJUTI"].includes(l.status);
  const editable = INCOMING_EDITABLE.includes(l.status);
  const timeline = trail.length
    ? trail.map((t) => ({ id: String(t.id), title: t.action.replaceAll("_", " ").toLowerCase(), note: t.metadata?.to ? `${STATUS_LABEL[String(t.metadata.from)] ?? t.metadata.from} ke ${STATUS_LABEL[String(t.metadata.to)] ?? t.metadata.to}` : null, at: t.created_at, by: t.actor_id ? names[t.actor_id] : null }))
    : [{ id: "c", title: "Surat dicatat", at: l.created_at, by: names[l.created_by] }, ...dispRows.map((d) => ({ id: d.id, title: `Disposisi ke ${names[d.assigned_to] ?? "penerima"}`, at: d.created_at, by: names[d.created_by] }))];

  return (
    <>
      <PageHeader title={l.subject} crumbs={[{ label: "Surat masuk", href: "/surat-masuk" }, { label: "Detail" }]}
        action={<>{p("letters.incoming.update") && editable && <LinkButton href={`/surat-masuk/${l.id}/ubah`} variant="secondary">Ubah</LinkButton>}</>} />
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />
      <div className="mb-6 rounded-lg border border-line bg-white p-4"><Stepper steps={INCOMING_STEPS} current={l.status} /></div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card title="Informasi surat">
            <div className="mb-4 flex gap-2"><StatusBadge value={l.status} /><StatusBadge value={l.nature} /></div>
            <DefinitionList items={[
              { label: "Nomor surat pengirim", value: l.external_number }, { label: "Kategori", value: l.category?.name },
              { label: "Tanggal surat", value: formatDate(l.letter_date) }, { label: "Tanggal diterima", value: formatDate(l.received_date) },
              { label: "Pengirim", value: l.sender }, { label: "Instansi asal", value: l.origin_org },
              { label: "Klasifikasi", value: l.classification }, { label: "Diterima oleh", value: names[l.received_by ?? ""] },
              { label: "Ringkasan isi", value: <span className="whitespace-pre-wrap">{l.summary}</span> },
            ]} />
          </Card>

          <Card title="Lampiran">
            {files.length ? (
              <ul className="divide-y divide-line">{files.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="flex min-w-0 items-center gap-2"><Paperclip className="h-4 w-4 shrink-0 text-ink-mute" aria-hidden /><span className="truncate">{f.file_name}</span><span className="shrink-0 text-xs text-ink-mute">{formatBytes(f.size_bytes)}</span></span>
                  <a href={`/api/files/${f.id}`} className="shrink-0 text-navy-700 underline">Unduh</a>
                </li>))}</ul>
            ) : <p className="text-sm text-ink-mute">Belum ada lampiran.</p>}
            {p("letters.incoming.update") && editable && (
              <form action={addIncomingAttachment} encType="multipart/form-data" className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
                <input type="hidden" name="id" value={l.id} />
                <div className="min-w-[12rem] flex-1"><Field label="Tambah lampiran" htmlFor="file"><input id="file" name="file" type="file" required accept="application/pdf,image/jpeg,image/png" className={inputClass} /></Field></div>
                <SubmitButton variant="secondary">Unggah</SubmitButton>
              </form>
            )}
          </Card>

          <Card title="Disposisi">
            {dispRows.length ? (
              <div className={tableClass.wrap}><table className={tableClass.table}>
                <thead><tr><th scope="col" className={tableClass.th}>Penerima</th><th scope="col" className={tableClass.th}>Instruksi</th><th scope="col" className={tableClass.th}>Tenggat</th><th scope="col" className={tableClass.th}>Status</th></tr></thead>
                <tbody>{dispRows.map((d) => (
                  <tr key={d.id}><td className={tableClass.td}><Link href={`/disposisi/${d.id}`} className="text-navy-800 hover:underline">{names[d.assigned_to] ?? "-"}</Link><p className="text-xs text-ink-mute">oleh {names[d.created_by] ?? "-"}</p></td>
                    <td className={tableClass.td}>{d.instruction}{d.completed_note && <p className="mt-1 text-xs text-ink-soft">Hasil: {d.completed_note}</p>}</td>
                    <td className={tableClass.td + " tabular-nums"}>{formatDate(d.due_date)}</td><td className={tableClass.td}><StatusBadge value={d.status} /></td></tr>))}</tbody>
              </table></div>
            ) : <EmptyState title="Belum ada disposisi" description={l.needs_disposition ? "Surat ini ditandai perlu disposisi." : "Tidak semua surat memerlukan disposisi."} />}
            {canDispose && (
              <form action={createDisposition} className="mt-5 space-y-4 border-t border-line pt-5">
                <h3 className="text-sm font-semibold text-navy-900">Buat disposisi</h3>
                <input type="hidden" name="incoming_id" value={l.id} />
                <fieldset><legend className="mb-1.5 text-sm font-medium">Penerima <span className="text-bad" aria-hidden>*</span></legend>
                  {assignable.length ? <div className="grid gap-1.5 sm:grid-cols-2">{assignable.map((u) => (
                    <label key={u.id} className="flex min-h-[40px] items-center gap-2 rounded-md border border-line px-3 text-sm"><input type="checkbox" name="assignees" value={u.id} className="h-4 w-4" />{u.full_name || "Tanpa nama"}</label>))}</div>
                    : <p className="text-sm text-ink-mute">Belum ada pengguna aktif yang dapat menerima disposisi. Tambahkan di menu Pengguna.</p>}
                </fieldset>
                <Field label="Instruksi" htmlFor="instruction" required><textarea id="instruction" name="instruction" rows={3} required className={inputClass} maxLength={2000} /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Prioritas" htmlFor="priority"><select id="priority" name="priority" defaultValue="NORMAL" className={inputClass}>{PRIORITIES.map((x) => <option key={x} value={x}>{STATUS_LABEL[x]}</option>)}</select></Field>
                  <Field label="Tenggat" htmlFor="due_date"><input id="due_date" name="due_date" type="date" className={inputClass} /></Field>
                </div>
                <SubmitButton>Kirim disposisi</SubmitButton>
              </form>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {(nextStatuses.length > 0 || (p("archives.manage") && l.status === "SELESAI") || (p("letters.incoming.delete") && ["DITERIMA", "DICATAT"].includes(l.status))) && (
            <Card title="Tindakan">
              <div className="space-y-3">
                {nextStatuses.filter((n) => n !== "MENUNGGU_DISPOSISI").map((n) => (
                  <form key={n} action={advanceIncoming}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="to" value={n} /><SubmitButton className="w-full">{NEXT_LABEL[n] ?? STATUS_LABEL[n]}</SubmitButton></form>
                ))}
                {p("archives.manage") && l.status === "SELESAI" && (
                  <form action={archiveIncoming}><input type="hidden" name="id" value={l.id} />
                    <ConfirmButton variant="primary" label="Arsipkan surat" title="Arsipkan surat ini?" message="Surat akan dipindahkan ke arsip dan tidak dapat diproses lagi." confirmLabel="Arsipkan">
                      <Field label="Catatan retensi (opsional)" htmlFor="note"><input id="note" name="note" className={inputClass} /></Field>
                    </ConfirmButton></form>
                )}
                {p("letters.incoming.delete") && ["DITERIMA", "DICATAT"].includes(l.status) && (
                  <form action={deleteIncoming}><input type="hidden" name="id" value={l.id} />
                    <ConfirmButton label="Hapus surat" title="Hapus surat ini?" message="Surat disembunyikan dari daftar. Penghapusan tercatat di audit log." confirmLabel="Hapus">
                      <Field label="Alasan penghapusan" htmlFor="reason" required><input id="reason" name="reason" required minLength={5} className={inputClass} /></Field>
                    </ConfirmButton></form>
                )}
              </div>
            </Card>
          )}
          <Card title="Riwayat aktivitas"><Timeline items={timeline} /></Card>
        </div>
      </div>
    </>
  );
}
