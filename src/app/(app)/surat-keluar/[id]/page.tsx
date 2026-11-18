import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getAttachments, getProfileMap } from "@/lib/data";
import { Card, DefinitionList, Field, Flash, inputClass, LinkButton, PageHeader, Stepper, StatusBadge, SubmitButton, Timeline } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { OUTGOING_STEPS } from "@/lib/constants";
import { firstParam, formatBytes, formatDate } from "@/lib/utils";
import { OUTGOING_EDITABLE } from "@/lib/workflow";
import { addOutgoingAttachment, archiveOutgoing, deleteOutgoing, finalizeOutgoing, recordDelivery, reviseOutgoing, transitionOutgoing } from "@/features/outgoing-actions";
import { Paperclip } from "lucide-react";

export const metadata = { title: "Detail surat keluar" };
const ACTION_TITLE: Record<string, string> = { SUBMIT: "Surat diajukan", REVIEW: "Mulai ditinjau", REQUEST_REVISION: "Diminta revisi", APPROVE: "Disetujui", FINALIZE: "Difinalkan dan diberi nomor", SEND: "Dikirim", ARCHIVE: "Diarsipkan", REOPEN: "Versi baru dibuat" };

export default async function Page({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | string[] | undefined> }) {
  const s = await requireSession();
  const sb = createClient();
  const { data: l } = await sb.from("outgoing_letters").select("*, category:letter_categories(name)").eq("id", params.id).maybeSingle();
  if (!l) notFound();
  const p = (x: Parameters<typeof can>[1]) => can(s.permissions, x);
  const [files, { data: appr }, { data: deliveries }] = await Promise.all([
    getAttachments(sb, "outgoing", l.id),
    sb.from("letter_approvals").select("id, action, actor_id, note, from_status, to_status, created_at").eq("outgoing_letter_id", l.id).order("created_at", { ascending: false }),
    sb.from("letter_deliveries").select("id, method, note, delivered_at, recorded_by").eq("outgoing_letter_id", l.id).order("delivered_at", { ascending: false }),
  ]);
  const hist = (appr ?? []) as any[];
  const names = await getProfileMap(sb, [l.created_by, l.reviewed_by, l.approved_by, l.number_allocated_by, ...hist.map((h) => h.actor_id)]);
  const isOwner = l.created_by === s.userId;
  const st = l.status as string;
  const canEdit = OUTGOING_EDITABLE.includes(st) && (isOwner || p("letters.outgoing.update"));
  const showPdf = ["FINAL", "DIKIRIM", "DIARSIPKAN"].includes(st);
  const lastRevisionNote = st === "PERLU_REVISI" ? hist.find((h) => h.action === "REQUEST_REVISION")?.note : null;
  const noteField = (id: string, label: string, req = false) => <Field label={label} htmlFor={id} required={req}><input id={id} name="note" required={req} className={inputClass} /></Field>;

  return (
    <>
      <PageHeader title={l.subject} crumbs={[{ label: "Surat keluar", href: "/surat-keluar" }, { label: "Detail" }]}
        action={<>{showPdf && <LinkButton href={`/api/outgoing/${l.id}/pdf`} variant="secondary">Unduh PDF</LinkButton>}{canEdit && <LinkButton href={`/surat-keluar/${l.id}/ubah`} variant="secondary">Ubah</LinkButton>}</>} />
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />
      {lastRevisionNote && <div role="note" className="mb-5 rounded-md border border-warn/30 bg-warn-bg px-4 py-3 text-sm text-warn"><strong>Catatan revisi:</strong> {lastRevisionNote}</div>}
      <div className="mb-6 rounded-lg border border-line bg-white p-4"><Stepper steps={OUTGOING_STEPS} current={st === "PERLU_REVISI" ? "DRAFT" : st} /></div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card title="Informasi surat">
            <div className="mb-4 flex flex-wrap gap-2"><StatusBadge value={st} /><StatusBadge value={l.nature} />{l.version > 1 && <StatusBadge tone="idle" value={`Versi ${l.version}`} />}</div>
            <DefinitionList items={[
              { label: "Nomor surat", value: l.number ? <span className="tabular-nums">{l.number}</span> : "Belum diberikan (dialokasikan saat finalisasi)" },
              { label: "Tanggal surat", value: formatDate(l.letter_date) }, { label: "Tujuan", value: l.recipient }, { label: "Jenis / kategori", value: `${l.letter_type}${l.category?.name ? " / " + l.category.name : ""}` },
              { label: "Dibuat oleh", value: names[l.created_by] }, { label: "Ditinjau oleh", value: names[l.reviewed_by ?? ""] },
              { label: "Disetujui oleh", value: l.approved_by ? `${names[l.approved_by]} (${formatDate(l.approved_at)})` : null }, { label: "Lampiran", value: l.attachment_note },
            ]} />
          </Card>
          <Card title="Isi surat"><div className="whitespace-pre-wrap font-display text-[15px] leading-7 text-ink">{l.body || <span className="text-ink-mute">Isi surat belum diisi.</span>}</div></Card>
          <Card title="Lampiran">
            {files.length ? <ul className="divide-y divide-line">{files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span className="flex min-w-0 items-center gap-2"><Paperclip className="h-4 w-4 shrink-0 text-ink-mute" aria-hidden /><span className="truncate">{f.file_name}</span><span className="shrink-0 text-xs text-ink-mute">{formatBytes(f.size_bytes)}</span></span><a href={`/api/files/${f.id}`} className="shrink-0 text-navy-700 underline">Unduh</a></li>))}</ul>
              : <p className="text-sm text-ink-mute">Belum ada lampiran.</p>}
            {canEdit && (
              <form action={addOutgoingAttachment} encType="multipart/form-data" className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
                <input type="hidden" name="id" value={l.id} />
                <div className="min-w-[12rem] flex-1"><Field label="Tambah lampiran" htmlFor="file"><input id="file" name="file" type="file" required accept="application/pdf,image/jpeg,image/png" className={inputClass} /></Field></div>
                <SubmitButton variant="secondary">Unggah</SubmitButton>
              </form>
            )}
          </Card>
          {deliveries && deliveries.length > 0 && (
            <Card title="Pengiriman"><ul className="space-y-2 text-sm">{deliveries.map((d: any) => <li key={d.id}>{d.method} - {formatDate(d.delivered_at)} oleh {names[d.recorded_by] ?? "-"}{d.note ? `: ${d.note}` : ""}</li>)}</ul></Card>
          )}
        </div>
        <div className="space-y-6">
          <Card title="Tindakan">
            <div className="space-y-3">
              {["DRAFT", "PERLU_REVISI"].includes(st) && p("letters.outgoing.submit") && (isOwner || p("letters.outgoing.update")) && (
                <form action={transitionOutgoing}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="action" value="SUBMIT" />
                  <ConfirmButton variant="primary" label="Ajukan untuk diperiksa" title="Ajukan surat?" message="Setelah diajukan, surat tidak dapat diubah sampai ditinjau atau diminta revisi." confirmLabel="Ajukan">{noteField("n1", "Catatan (opsional)")}</ConfirmButton></form>
              )}
              {st === "DIAJUKAN" && p("letters.outgoing.approve") && (
                <form action={transitionOutgoing}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="action" value="REVIEW" /><SubmitButton className="w-full">Mulai tinjau</SubmitButton></form>
              )}
              {st === "DITINJAU" && p("letters.outgoing.approve") && (
                <form action={transitionOutgoing}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="action" value="APPROVE" />
                  <ConfirmButton variant="primary" label="Setujui surat" title="Setujui surat ini?" message="Persetujuan tercatat atas nama Anda. Nomor surat diberikan saat finalisasi." confirmLabel="Setujui">{noteField("n2", "Catatan (opsional)")}</ConfirmButton></form>
              )}
              {["DIAJUKAN", "DITINJAU"].includes(st) && p("letters.outgoing.approve") && (
                <form action={transitionOutgoing}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="action" value="REQUEST_REVISION" />
                  <ConfirmButton label="Minta revisi" title="Minta revisi?" message="Surat dikembalikan ke pembuat dengan catatan Anda." confirmLabel="Kirim permintaan">{noteField("n3", "Alasan revisi", true)}</ConfirmButton></form>
              )}
              {st === "DISETUJUI" && p("letters.outgoing.update") && (
                <form action={finalizeOutgoing}><input type="hidden" name="id" value={l.id} />
                  <ConfirmButton variant="primary" label="Beri nomor dan finalkan" title="Finalkan surat?" message="Nomor surat dialokasikan secara permanen dan isi surat dikunci pada versi ini." confirmLabel="Finalkan" /></form>
              )}
              {["DISETUJUI", "FINAL"].includes(st) && p("letters.outgoing.update") && (
                <form action={reviseOutgoing}><input type="hidden" name="id" value={l.id} />
                  <ConfirmButton label="Buat versi baru" title="Buat versi baru?" message="Surat dibuka kembali untuk revisi sebagai versi berikutnya. Versi sebelumnya tetap tersimpan." confirmLabel="Buat versi baru">{noteField("n4", "Alasan perubahan", true)}</ConfirmButton></form>
              )}
              {st === "FINAL" && p("letters.outgoing.update") && (
                <form action={recordDelivery} className="space-y-3 border-t border-line pt-3"><input type="hidden" name="id" value={l.id} />
                  <Field label="Metode pengiriman" htmlFor="method" required><input id="method" name="method" required placeholder="mis. diantar langsung, pos, email" className={inputClass} /></Field>
                  <Field label="Catatan" htmlFor="dnote"><input id="dnote" name="note" className={inputClass} /></Field>
                  <SubmitButton className="w-full">Catat pengiriman</SubmitButton></form>
              )}
              {st === "DIKIRIM" && p("archives.manage") && (
                <form action={archiveOutgoing}><input type="hidden" name="id" value={l.id} />
                  <ConfirmButton variant="primary" label="Arsipkan surat" title="Arsipkan surat ini?" message="Surat dipindahkan ke arsip." confirmLabel="Arsipkan">{noteField("n5", "Catatan retensi (opsional)")}</ConfirmButton></form>
              )}
              {st === "DRAFT" && (isOwner || p("letters.outgoing.update")) && (
                <form action={deleteOutgoing}><input type="hidden" name="id" value={l.id} />
                  <ConfirmButton label="Hapus draft" title="Hapus draft ini?" message="Draft disembunyikan. Penghapusan tercatat di audit log." confirmLabel="Hapus"><Field label="Alasan" htmlFor="reason" required><input id="reason" name="reason" required minLength={5} className={inputClass} /></Field></ConfirmButton></form>
              )}
              {!["DRAFT", "PERLU_REVISI", "DIAJUKAN", "DITINJAU", "DISETUJUI", "FINAL", "DIKIRIM"].includes(st) && <p className="text-sm text-ink-mute">Surat sudah diarsipkan. Tidak ada tindakan tersedia.</p>}
            </div>
          </Card>
          <Card title="Riwayat persetujuan">
            <Timeline items={[...hist.map((h) => ({ id: h.id, title: ACTION_TITLE[h.action] ?? h.action, note: h.note, at: h.created_at, by: names[h.actor_id] })), { id: "created", title: "Draft dibuat", at: l.created_at, by: names[l.created_by] }]} />
          </Card>
        </div>
      </div>
    </>
  );
}
