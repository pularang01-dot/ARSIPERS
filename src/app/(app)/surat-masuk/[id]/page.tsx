import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getAssignableUsers, getAttachments, getAuditTrail, getProfileMap } from "@/lib/data";
import { buttonClass, Card, DefinitionList, Field, Flash, inputClass, LinkButton, StatusBadge, SubmitButton, Timeline } from "@/components/ui";
import { Avatar, FileCard, LetterHeader, ProgressTrack, TestBadge } from "@/components/letters";
import { FileInput } from "@/components/FileInput";
import { ConfirmButton } from "@/components/ConfirmButton";
import { INCOMING_STEPS, PRIORITIES, STATUS_LABEL } from "@/lib/constants";
import { firstParam, formatDate, todayJakarta } from "@/lib/utils";
import { INCOMING_EDITABLE, INCOMING_TRANSITIONS } from "@/lib/workflow";
import { deleteArchived, unarchiveLetter } from "@/features/archive-actions";
import { addIncomingAttachment, advanceIncoming, archiveIncoming, createDisposition, deleteIncoming } from "@/features/incoming-actions";
import { Building2, CalendarDays, Hash, Plus } from "lucide-react";

export const metadata = { title: "Detail surat masuk" };
type Row = Record<string, any>;

const NEXT_LABEL: Record<string, string> = { DITINDAKLANJUTI: "Tandai ditindaklanjuti", SELESAI: "Tandai selesai", DIVERIFIKASI: "Verifikasi surat", DICATAT: "Tandai dicatat" };
const STEP_HELP: Record<string, string> = {
  DITERIMA: "Surat baru diterima.",
  DICATAT: "Periksa data dan lampiran, lalu verifikasi surat.",
  DIVERIFIKASI: "Surat siap didisposisikan, atau langsung ditandai selesai bila tidak perlu tindak lanjut.",
  MENUNGGU_DISPOSISI: "Menunggu penerima disposisi menanggapi.",
  DITINDAKLANJUTI: "Disposisi sedang dikerjakan. Tandai selesai setelah semua beres.",
  SELESAI: "Surat selesai diproses. Dapat diarsipkan.",
  DIARSIPKAN: "Surat sudah diarsipkan.",
};

export default async function Page({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | string[] | undefined> }) {
  const s = await requireSession();
  const sb = createClient();
  const { data: l } = await sb.from("incoming_letters").select("*, category:letter_categories(name)").eq("id", params.id).maybeSingle();
  if (!l) notFound(); // RLS: tanpa izin = tidak ditemukan
  const p = (x: Parameters<typeof can>[1]) => can(s.permissions, x);

  const [files, disps, assignable] = await Promise.all([
    getAttachments(sb, "incoming", l.id),
    sb.from("letter_dispositions").select("id, assigned_to, instruction, priority, due_date, status, completed_note, created_by, created_at").eq("incoming_letter_id", l.id).order("created_at", { ascending: false }),
    p("letters.disposition.create") ? getAssignableUsers(sb) : Promise.resolve([] as { id: string; full_name: string; role_code: string }[]),
  ]);
  const dispRows = (disps.data ?? []) as Row[];
  const trail = p("audit_logs.view") ? await getAuditTrail(sb, "incoming_letter", l.id) : [];
  const names = await getProfileMap(sb, [l.created_by, l.received_by, ...dispRows.map((d) => d.assigned_to), ...dispRows.map((d) => d.created_by), ...trail.map((t) => t.actor_id)]);

  const nextStatuses = p("letters.incoming.update") ? (INCOMING_TRANSITIONS[l.status] ?? []).filter((n: string) => n !== "MENUNGGU_DISPOSISI") : [];
  const canDispose = p("letters.disposition.create") && ["DIVERIFIKASI", "MENUNGGU_DISPOSISI", "DITINDAKLANJUTI"].includes(l.status);
  const editable = INCOMING_EDITABLE.includes(l.status);
  const canArchive = p("archives.manage") && l.status === "SELESAI";
  const canUnarchive = p("archives.manage") && l.status === "DIARSIPKAN";
  const canDeleteArchive = p("archives.delete") && l.status === "DIARSIPKAN";
  const canDelete = p("letters.incoming.delete") && ["DITERIMA", "DICATAT"].includes(l.status);
  const today = todayJakarta();

  const timeline = trail.length
    ? trail.map((t) => ({ id: String(t.id), title: t.action.replaceAll("_", " ").toLowerCase(), note: t.metadata?.to ? `${STATUS_LABEL[String(t.metadata.from)] ?? t.metadata.from} ke ${STATUS_LABEL[String(t.metadata.to)] ?? t.metadata.to}` : null, at: t.created_at, by: t.actor_id ? names[t.actor_id] : null }))
    : [{ id: "c", title: "Surat dicatat", at: l.created_at, by: names[l.created_by] }, ...dispRows.map((d) => ({ id: d.id, title: `Disposisi ke ${names[d.assigned_to] ?? "penerima"}`, at: d.created_at, by: names[d.created_by] }))];

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-mute"><Link href="/surat-masuk" className="hover:text-ink hover:underline">Surat masuk</Link> <span aria-hidden>/</span> <span aria-current="page">Detail</span></nav>
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />

      <LetterHeader eyebrow="Surat masuk" title={l.subject}
        badges={<><StatusBadge value={l.status} />{l.is_test && <TestBadge />}{l.nature !== "BIASA" && <StatusBadge value={l.nature} />}{l.needs_disposition && <StatusBadge value="PENTING" tone="warn" />}</>}
        meta={[{ icon: Hash, text: l.external_number || "Tanpa nomor" }, { icon: Building2, text: l.sender }, { icon: CalendarDays, text: `Diterima ${formatDate(l.received_date)}` }]}
        actions={p("letters.incoming.update") && editable ? <LinkButton href={`/surat-masuk/${l.id}/ubah`} variant="secondary">Ubah data</LinkButton> : undefined} />

      <ProgressTrack steps={INCOMING_STEPS} current={l.status} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Card title="Informasi surat">
            <DefinitionList items={[
              { label: "Nomor surat pengirim", value: l.external_number }, { label: "Kategori", value: l.category?.name },
              { label: "Tanggal surat", value: formatDate(l.letter_date) }, { label: "Tanggal diterima", value: formatDate(l.received_date) },
              { label: "Pengirim", value: l.sender }, { label: "Instansi asal", value: l.origin_org },
              { label: "Klasifikasi", value: l.classification }, { label: "Dicatat oleh", value: names[l.received_by ?? l.created_by] },
            ]} />
            {l.summary && <div className="mt-5 rounded-lg bg-surface p-4"><p className="mb-1 text-xs font-medium text-ink-mute">Ringkasan isi</p><p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{l.summary}</p></div>}
          </Card>

          <Card title={`Lampiran (${files.length})`}>
            {files.length ? <ul className="space-y-2.5">{files.map((f) => <FileCard key={f.id} id={f.id} name={f.file_name} size={f.size_bytes} mime={f.mime_type} date={f.created_at} />)}</ul> : <p className="text-sm text-ink-mute">Belum ada lampiran.</p>}
            {p("letters.incoming.update") && editable && (
              <form action={addIncomingAttachment} encType="multipart/form-data" className="mt-4 space-y-3 border-t border-line pt-4">
                <input type="hidden" name="id" value={l.id} />
                <Field label="Tambah lampiran" htmlFor="file"><FileInput id="file" required compact hint="PDF, JPG, atau PNG" /></Field>
                <SubmitButton variant="secondary">Unggah lampiran</SubmitButton>
              </form>
            )}
          </Card>

          <div id="disposisi" className="scroll-mt-24">
            <Card title={`Disposisi (${dispRows.length})`}>
              {dispRows.length ? (
                <ul className="space-y-3">
                  {dispRows.map((d) => {
                    const late = d.due_date && d.due_date < today && d.status !== "SELESAI";
                    return (
                      <li key={d.id} className="rounded-lg border border-line p-4">
                        <div className="flex items-start gap-3">
                          <Avatar name={names[d.assigned_to] ?? "?"} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <Link href={`/disposisi/${d.id}`} className="text-sm font-semibold text-navy-800 hover:underline">{names[d.assigned_to] ?? "Penerima"}</Link>
                              <div className="flex items-center gap-2"><StatusBadge value={d.priority} /><StatusBadge value={d.status} /></div>
                            </div>
                            <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">{d.instruction}</p>
                            {d.completed_note && <p className="mt-2 rounded-md bg-ok-bg px-3 py-2 text-xs text-ok"><strong>Hasil:</strong> {d.completed_note}</p>}
                            <p className={`mt-2 text-xs tabular-nums ${late ? "font-semibold text-bad" : "text-ink-mute"}`}>Diberikan oleh {names[d.created_by] ?? "-"} - tenggat {formatDate(d.due_date)}{late ? " (lewat)" : ""}</p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="text-sm text-ink-mute">{l.needs_disposition ? "Surat ini ditandai perlu disposisi, tetapi belum ada yang ditugaskan." : "Belum ada disposisi. Tidak semua surat memerlukannya."}</p>}

              {canDispose && (
                <details className="group mt-5 rounded-lg border border-line-strong bg-surface" open={dispRows.length === 0}>
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-navy-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600"><Plus className="h-4 w-4 transition-transform group-open:rotate-45" aria-hidden />Buat disposisi baru</summary>
                  <form action={createDisposition} className="space-y-4 border-t border-line bg-white p-4">
                    <input type="hidden" name="incoming_id" value={l.id} />
                    <fieldset><legend className="mb-1.5 text-sm font-medium">Penerima <span className="text-bad" aria-hidden>*</span></legend>
                      {assignable.length ? <div className="grid gap-2 sm:grid-cols-2">{assignable.map((u) => (
                        <label key={u.id} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-line-strong px-3 text-sm has-[:checked]:border-navy-700 has-[:checked]:bg-navy-50">
                          <input type="checkbox" name="assignees" value={u.id} className="h-4 w-4" /><Avatar name={u.full_name} size={28} /><span className="truncate">{u.full_name || "Tanpa nama"}</span></label>))}</div>
                        : <p className="text-sm text-ink-mute">Belum ada pengguna aktif yang dapat menerima disposisi. Tambahkan di menu Pengguna.</p>}
                    </fieldset>
                    <Field label="Instruksi" htmlFor="instruction" required><textarea id="instruction" name="instruction" rows={3} required className={inputClass} maxLength={2000} placeholder="Apa yang perlu dilakukan penerima?" /></Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Prioritas" htmlFor="priority"><select id="priority" name="priority" defaultValue="NORMAL" className={inputClass}>{PRIORITIES.map((x) => <option key={x} value={x}>{STATUS_LABEL[x]}</option>)}</select></Field>
                      <Field label="Tenggat" htmlFor="due_date"><input id="due_date" name="due_date" type="date" min={today} className={inputClass} /></Field>
                    </div>
                    <SubmitButton>Kirim disposisi</SubmitButton>
                  </form>
                </details>
              )}
            </Card>
          </div>
        </div>

        <aside className="min-w-0 space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card title="Langkah berikutnya">
            <p className="mb-4 text-sm leading-relaxed text-ink-soft">{STEP_HELP[l.status]}</p>
            <div className="space-y-2.5">
              {canDispose && <a href="#disposisi" className={buttonClass("primary", "w-full")}>Buat disposisi</a>}
              {nextStatuses.map((n: string, i: number) => (
                <form key={n} action={advanceIncoming}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="to" value={n} />
                  <SubmitButton variant={i === 0 && !canDispose ? "primary" : "secondary"} className="w-full">{NEXT_LABEL[n] ?? STATUS_LABEL[n]}</SubmitButton></form>
              ))}
              {canArchive && (
                <form action={archiveIncoming}><input type="hidden" name="id" value={l.id} />
                  <ConfirmButton variant="primary" label="Arsipkan surat" title="Arsipkan surat ini?" message="Surat akan dipindahkan ke arsip dan tidak dapat diproses lagi." confirmLabel="Arsipkan">
                    <Field label="Catatan retensi (opsional)" htmlFor="note"><input id="note" name="note" className={inputClass} /></Field>
                  </ConfirmButton></form>
              )}
              {canUnarchive && (
                <form action={unarchiveLetter}><input type="hidden" name="kind" value="incoming" /><input type="hidden" name="id" value={l.id} /><input type="hidden" name="back" value="detail" />
                  <ConfirmButton label="Batalkan pengarsipan" title="Batalkan pengarsipan?" message="Surat dikembalikan ke status Selesai dan keluar dari arsip. Tercatat di audit log." confirmLabel="Batalkan arsip">
                    <Field label="Alasan pembatalan" htmlFor="ua-reason" required><input id="ua-reason" name="reason" required minLength={5} className={inputClass} /></Field>
                  </ConfirmButton></form>
              )}
              {canDeleteArchive && (
                <form action={deleteArchived}><input type="hidden" name="kind" value="incoming" /><input type="hidden" name="id" value={l.id} />
                  <ConfirmButton label="Hapus arsip" title="Hapus surat arsip ini?" confirmLabel="Hapus arsip" message="Surat disembunyikan dari semua daftar dan tidak dapat dipulihkan lewat aplikasi. Tercatat di audit log. Jika hanya salah mengarsipkan, gunakan Batalkan pengarsipan.">
                    <Field label="Ketik HAPUS untuk konfirmasi" htmlFor="da-c"><input id="da-c" name="confirm" autoComplete="off" className={inputClass} /></Field>
                    <Field label="Alasan penghapusan" htmlFor="da-r"><input id="da-r" name="delete_reason" className={inputClass} /></Field>
                  </ConfirmButton></form>
              )}
              {!canDispose && nextStatuses.length === 0 && !canArchive && !canUnarchive && !canDeleteArchive && <p className="text-sm text-ink-mute">Tidak ada tindakan yang tersedia untuk Anda pada tahap ini.</p>}
            </div>
            {canDelete && (
              <form action={deleteIncoming} className="mt-5 border-t border-line pt-4"><input type="hidden" name="id" value={l.id} />
                <ConfirmButton label="Hapus surat" title="Hapus surat ini?" message="Surat disembunyikan dari daftar. Penghapusan tercatat di audit log." confirmLabel="Hapus">
                  <Field label="Alasan penghapusan" htmlFor="reason" required><input id="reason" name="reason" required minLength={5} className={inputClass} /></Field>
                </ConfirmButton></form>
            )}
          </Card>
          <Card title="Riwayat aktivitas"><Timeline items={timeline} /></Card>
        </aside>
      </div>
    </div>
  );
}