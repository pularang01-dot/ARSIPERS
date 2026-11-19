import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getAttachments, getProfileMap } from "@/lib/data";
import { Card, DefinitionList, Field, Flash, inputClass, LinkButton, StatusBadge, SubmitButton, Timeline } from "@/components/ui";
import { FileCard, LetterHeader, ProgressTrack } from "@/components/letters";
import { FileInput } from "@/components/FileInput";
import { ConfirmButton } from "@/components/ConfirmButton";
import { OUTGOING_STEPS } from "@/lib/constants";
import { firstParam, formatDate } from "@/lib/utils";
import { OUTGOING_EDITABLE } from "@/lib/workflow";
import { deleteArchived, unarchiveLetter } from "@/features/archive-actions";
import { addOutgoingAttachment, archiveOutgoing, deleteOutgoing, finalizeOutgoing, recordDelivery, reviseOutgoing, transitionOutgoing } from "@/features/outgoing-actions";
import { CalendarDays, Download, Hash, Send, User } from "lucide-react";

export const metadata = { title: "Detail surat keluar" };
type Row = Record<string, any>;

const ACTION_TITLE: Record<string, string> = { SUBMIT: "Surat diajukan", REVIEW: "Mulai ditinjau", REQUEST_REVISION: "Diminta revisi", APPROVE: "Disetujui", FINALIZE: "Difinalkan dan diberi nomor", SEND: "Dikirim", ARCHIVE: "Diarsipkan", UNARCHIVE: "Pengarsipan dibatalkan", REOPEN: "Versi baru dibuat" };
const STEP_HELP: Record<string, string> = {
  DRAFT: "Lengkapi isi surat, lalu ajukan untuk diperiksa.",
  PERLU_REVISI: "Perbaiki surat sesuai catatan revisi, lalu ajukan kembali.",
  DIAJUKAN: "Menunggu pemeriksa memulai peninjauan.",
  DITINJAU: "Surat sedang ditinjau. Setujui atau minta revisi.",
  DISETUJUI: "Surat disetujui. Berikan nomor dan finalkan untuk mengunci isinya.",
  FINAL: "Surat final dan bernomor. Unduh PDF, lalu catat pengirimannya.",
  DIKIRIM: "Surat sudah dikirim. Arsipkan bila selesai.",
  DIARSIPKAN: "Surat sudah diarsipkan.",
};

export default async function Page({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | string[] | undefined> }) {
  const s = await requireSession();
  const sb = createClient();
  const { data: l } = await sb.from("outgoing_letters").select("*, category:letter_categories(name)").eq("id", params.id).maybeSingle();
  if (!l) notFound();
  const p = (x: Parameters<typeof can>[1]) => can(s.permissions, x);
  const [files, appr, deliveries] = await Promise.all([
    getAttachments(sb, "outgoing", l.id),
    sb.from("letter_approvals").select("id, action, actor_id, note, from_status, to_status, created_at").eq("outgoing_letter_id", l.id).order("created_at", { ascending: false }),
    sb.from("letter_deliveries").select("id, method, note, delivered_at, recorded_by").eq("outgoing_letter_id", l.id).order("delivered_at", { ascending: false }),
  ]);
  const hist = (appr.data ?? []) as Row[];
  const sent = (deliveries.data ?? []) as Row[];
  const names = await getProfileMap(sb, [l.created_by, l.reviewed_by, l.approved_by, l.number_allocated_by, ...hist.map((h) => h.actor_id), ...sent.map((d) => d.recorded_by)]);

  const isOwner = l.created_by === s.userId;
  const st = l.status as string;
  const canEdit = OUTGOING_EDITABLE.includes(st) && (isOwner || p("letters.outgoing.update"));
  const showPdf = ["FINAL", "DIKIRIM", "DIARSIPKAN"].includes(st);
  const lastRevisionNote = st === "PERLU_REVISI" ? hist.find((h) => h.action === "REQUEST_REVISION")?.note : null;
  const noteField = (id: string, label: string, req = false) => <Field label={label} htmlFor={id} required={req}><input id={id} name="note" required={req} className={inputClass} /></Field>;

  const canSubmit = ["DRAFT", "PERLU_REVISI"].includes(st) && p("letters.outgoing.submit") && (isOwner || p("letters.outgoing.update"));
  const canReview = st === "DIAJUKAN" && p("letters.outgoing.approve");
  const canApprove = st === "DITINJAU" && p("letters.outgoing.approve");
  const canRequestRevision = ["DIAJUKAN", "DITINJAU"].includes(st) && p("letters.outgoing.approve");
  const canFinalize = st === "DISETUJUI" && p("letters.outgoing.update");
  const canRevise = ["DISETUJUI", "FINAL"].includes(st) && p("letters.outgoing.update");
  const canDeliver = st === "FINAL" && p("letters.outgoing.update");
  const canArchive = st === "DIKIRIM" && p("archives.manage");
  const canUnarchive = st === "DIARSIPKAN" && p("archives.manage");
  const canDeleteArchive = st === "DIARSIPKAN" && p("archives.delete");
  const canDelete = st === "DRAFT" && (isOwner || p("letters.outgoing.update"));
  const hasAction = canSubmit || canReview || canApprove || canRequestRevision || canFinalize || canRevise || canDeliver || canArchive || canUnarchive || canDeleteArchive || canDelete;

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-mute"><Link href="/surat-keluar" className="hover:text-ink hover:underline">Surat keluar</Link> <span aria-hidden>/</span> <span aria-current="page">Detail</span></nav>
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />
      {lastRevisionNote && <div role="note" className="rounded-xl border border-brass/40 bg-brass-soft px-5 py-4 text-sm text-brass-dark"><strong>Catatan revisi:</strong> {lastRevisionNote}</div>}

      <LetterHeader eyebrow={`Surat keluar${l.number ? " - " + l.number : ""}`} title={l.subject}
        badges={<><StatusBadge value={st} />{l.nature !== "BIASA" && <StatusBadge value={l.nature} />}{l.version > 1 && <StatusBadge tone="idle" value={`Versi ${l.version}`} />}</>}
        meta={[{ icon: Hash, text: l.number ?? "Nomor belum diberikan" }, { icon: Send, text: `Kepada ${l.recipient}` }, { icon: CalendarDays, text: formatDate(l.letter_date) }, { icon: User, text: `Dibuat oleh ${names[l.created_by] ?? "-"}` }]}
        actions={<>{showPdf && <LinkButton href={`/api/outgoing/${l.id}/pdf`} variant="secondary"><Download className="h-4 w-4" aria-hidden />Unduh PDF</LinkButton>}{canEdit && <LinkButton href={`/surat-keluar/${l.id}/ubah`} variant="secondary">Ubah draft</LinkButton>}</>} />

      <ProgressTrack steps={OUTGOING_STEPS} current={st === "PERLU_REVISI" ? "DRAFT" : st} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <section aria-label="Isi surat" className="rounded-xl border border-line bg-surface p-4 sm:p-8">
            <article className="mx-auto max-w-[680px] rounded-sm border border-line bg-white px-7 py-9 font-display text-[15px] leading-7 text-ink shadow-lift sm:px-10">
              <div className="mb-6 space-y-0.5 text-sm text-ink-soft">
                <p><span className="inline-block w-20">Nomor</span>: {l.number ?? "(belum diberikan)"}</p>
                <p><span className="inline-block w-20">Lampiran</span>: {l.attachment_note || "-"}</p>
                <p><span className="inline-block w-20">Perihal</span>: <strong className="text-ink">{l.subject}</strong></p>
              </div>
              <p className="mb-5">Yth. {l.recipient}</p>
              <div className="whitespace-pre-wrap">{l.body || <span className="text-ink-mute">Isi surat belum diisi.</span>}</div>
            </article>
          </section>

          <Card title="Informasi">
            <DefinitionList items={[
              { label: "Jenis / kategori", value: `${l.letter_type}${l.category?.name ? " / " + l.category.name : ""}` }, { label: "Tanggal surat", value: formatDate(l.letter_date) },
              { label: "Ditinjau oleh", value: names[l.reviewed_by ?? ""] }, { label: "Disetujui oleh", value: l.approved_by ? `${names[l.approved_by]} (${formatDate(l.approved_at)})` : null },
              { label: "Nomor diterbitkan oleh", value: names[l.number_allocated_by ?? ""] }, { label: "Keterangan lampiran", value: l.attachment_note },
            ]} />
          </Card>

          <Card title={`Lampiran (${files.length})`}>
            {files.length ? <ul className="space-y-2.5">{files.map((f) => <FileCard key={f.id} id={f.id} name={f.file_name} size={f.size_bytes} mime={f.mime_type} date={f.created_at} />)}</ul> : <p className="text-sm text-ink-mute">Belum ada lampiran.</p>}
            {canEdit && (
              <form action={addOutgoingAttachment} encType="multipart/form-data" className="mt-4 space-y-3 border-t border-line pt-4">
                <input type="hidden" name="id" value={l.id} />
                <Field label="Tambah lampiran" htmlFor="file"><FileInput id="file" required compact hint="PDF, JPG, atau PNG" /></Field>
                <SubmitButton variant="secondary">Unggah lampiran</SubmitButton>
              </form>
            )}
          </Card>

          {sent.length > 0 && (
            <Card title="Pengiriman"><ul className="space-y-2 text-sm">{sent.map((d) => <li key={d.id}><strong>{d.method}</strong> - {formatDate(d.delivered_at)} oleh {names[d.recorded_by] ?? "-"}{d.note ? `: ${d.note}` : ""}</li>)}</ul></Card>
          )}
        </div>

        <aside className="min-w-0 space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card title="Langkah berikutnya">
            <p className="mb-4 text-sm leading-relaxed text-ink-soft">{STEP_HELP[st]}</p>
            <div className="space-y-2.5">
              {canSubmit && (
                <form action={transitionOutgoing}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="action" value="SUBMIT" />
                  <ConfirmButton variant="primary" label="Ajukan untuk diperiksa" title="Ajukan surat?" message="Setelah diajukan, surat tidak dapat diubah sampai ditinjau atau diminta revisi." confirmLabel="Ajukan">{noteField("n1", "Catatan (opsional)")}</ConfirmButton></form>
              )}
              {canReview && <form action={transitionOutgoing}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="action" value="REVIEW" /><SubmitButton className="w-full">Mulai tinjau</SubmitButton></form>}
              {canApprove && (
                <form action={transitionOutgoing}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="action" value="APPROVE" />
                  <ConfirmButton variant="primary" label="Setujui surat" title="Setujui surat ini?" message="Persetujuan tercatat atas nama Anda. Nomor surat diberikan saat finalisasi." confirmLabel="Setujui">{noteField("n2", "Catatan (opsional)")}</ConfirmButton></form>
              )}
              {canRequestRevision && (
                <form action={transitionOutgoing}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="action" value="REQUEST_REVISION" />
                  <ConfirmButton label="Minta revisi" title="Minta revisi?" message="Surat dikembalikan ke pembuat dengan catatan Anda." confirmLabel="Kirim permintaan">{noteField("n3", "Alasan revisi", true)}</ConfirmButton></form>
              )}
              {canFinalize && (
                <form action={finalizeOutgoing}><input type="hidden" name="id" value={l.id} />
                  <ConfirmButton variant="primary" label="Beri nomor dan finalkan" title="Finalkan surat?" message="Nomor surat dialokasikan secara permanen dan isi surat dikunci pada versi ini." confirmLabel="Finalkan" /></form>
              )}
              {canDeliver && (
                <form action={recordDelivery} className="space-y-3 rounded-lg border border-line bg-surface p-3.5"><input type="hidden" name="id" value={l.id} />
                  <Field label="Metode pengiriman" htmlFor="method" required><input id="method" name="method" required placeholder="mis. diantar langsung, pos, email" className={inputClass} /></Field>
                  <Field label="Catatan" htmlFor="dnote"><input id="dnote" name="note" className={inputClass} /></Field>
                  <SubmitButton className="w-full">Catat pengiriman</SubmitButton></form>
              )}
              {canArchive && (
                <form action={archiveOutgoing}><input type="hidden" name="id" value={l.id} />
                  <ConfirmButton variant="primary" label="Arsipkan surat" title="Arsipkan surat ini?" message="Surat dipindahkan ke arsip." confirmLabel="Arsipkan">{noteField("n5", "Catatan retensi (opsional)")}</ConfirmButton></form>
              )}
              {canRevise && (
                <form action={reviseOutgoing}><input type="hidden" name="id" value={l.id} />
                  <ConfirmButton label="Buat versi baru" title="Buat versi baru?" message="Surat dibuka kembali untuk revisi sebagai versi berikutnya. Versi sebelumnya tetap tersimpan." confirmLabel="Buat versi baru">{noteField("n4", "Alasan perubahan", true)}</ConfirmButton></form>
              )}
              {canUnarchive && (
                <form action={unarchiveLetter}><input type="hidden" name="kind" value="outgoing" /><input type="hidden" name="id" value={l.id} /><input type="hidden" name="back" value="detail" />
                  <ConfirmButton label="Batalkan pengarsipan" title="Batalkan pengarsipan?" message="Surat dikembalikan ke status Dikirim dan keluar dari arsip. Tercatat di audit log." confirmLabel="Batalkan arsip">
                    <Field label="Alasan pembatalan" htmlFor="ua-reason" required><input id="ua-reason" name="reason" required minLength={5} className={inputClass} /></Field>
                  </ConfirmButton></form>
              )}
              {canDeleteArchive && (
                <form action={deleteArchived}><input type="hidden" name="kind" value="outgoing" /><input type="hidden" name="id" value={l.id} />
                  <ConfirmButton label="Hapus arsip" title="Hapus surat arsip ini?" confirmLabel="Hapus arsip" message="Surat disembunyikan dari semua daftar dan tidak dapat dipulihkan lewat aplikasi. Tercatat di audit log. Jika hanya salah mengarsipkan, gunakan Batalkan pengarsipan.">
                    <Field label="Ketik HAPUS untuk konfirmasi" htmlFor="da-c"><input id="da-c" name="confirm" autoComplete="off" className={inputClass} /></Field>
                    <Field label="Alasan penghapusan" htmlFor="da-r"><input id="da-r" name="delete_reason" className={inputClass} /></Field>
                  </ConfirmButton></form>
              )}
              {!hasAction && <p className="text-sm text-ink-mute">{st === "DIARSIPKAN" ? "Surat sudah diarsipkan." : "Tidak ada tindakan yang tersedia untuk Anda pada tahap ini."}</p>}
            </div>
            {canDelete && (
              <form action={deleteOutgoing} className="mt-5 border-t border-line pt-4"><input type="hidden" name="id" value={l.id} />
                <ConfirmButton label="Hapus draft" title="Hapus draft ini?" message="Draft disembunyikan. Penghapusan tercatat di audit log." confirmLabel="Hapus"><Field label="Alasan" htmlFor="reason" required><input id="reason" name="reason" required minLength={5} className={inputClass} /></Field></ConfirmButton></form>
            )}
          </Card>
          <Card title="Riwayat persetujuan">
            <Timeline items={[...hist.map((h) => ({ id: h.id as string, title: ACTION_TITLE[h.action] ?? (h.action as string), note: h.note as string | null, at: h.created_at as string, by: names[h.actor_id] })), { id: "created", title: "Draft dibuat", at: l.created_at as string, by: names[l.created_by] }]} />
          </Card>
        </aside>
      </div>
    </div>
  );
}