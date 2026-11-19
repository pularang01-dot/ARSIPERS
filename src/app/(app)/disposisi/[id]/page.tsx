import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getProfileMap } from "@/lib/data";
import { buttonClass, Card, DefinitionList, Field, Flash, inputClass, StatusBadge, SubmitButton, Timeline } from "@/components/ui";
import { Avatar, LetterHeader, ProgressTrack } from "@/components/letters";
import { DISPOSITION_STEPS } from "@/lib/constants";
import { firstParam, formatDate, todayJakarta } from "@/lib/utils";
import { DISPOSITION_TRANSITIONS } from "@/lib/workflow";
import { respondDisposition } from "@/features/disposition-actions";
import { CalendarClock, ExternalLink, User } from "lucide-react";

export const metadata = { title: "Detail disposisi" };
type Row = Record<string, any>;

const LABEL: Record<string, string> = { DITERIMA: "Terima disposisi", DALAM_PROSES: "Mulai kerjakan", SELESAI: "Tandai selesai" };
const HELP: Record<string, string> = {
  MENUNGGU: "Disposisi baru. Konfirmasi bahwa Anda sudah menerimanya.",
  DITERIMA: "Mulai mengerjakan, atau langsung selesaikan bila sudah beres.",
  DALAM_PROSES: "Tulis hasil tindak lanjut lalu tandai selesai.",
  SELESAI: "Disposisi selesai.",
};

export default async function Page({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | string[] | undefined> }) {
  const s = await requireSession();
  const sb = createClient();
  const { data: d } = await sb.from("letter_dispositions").select("*, incoming:incoming_letters(id, subject, sender, is_confidential, status)").eq("id", params.id).maybeSingle();
  if (!d) notFound();
  const { data: respData } = await sb.from("disposition_responses").select("id, author_id, note, status_after, created_at").eq("disposition_id", d.id).order("created_at", { ascending: false });
  const resp = (respData ?? []) as Row[];
  const names = await getProfileMap(sb, [d.assigned_to, d.created_by, ...resp.map((r) => r.author_id)]);

  const mine = d.assigned_to === s.userId && can(s.permissions, "letters.disposition.respond");
  const nexts = mine ? DISPOSITION_TRANSITIONS[d.status] ?? [] : [];
  const canOpenLetter = can(s.permissions, "letters.incoming.view") || mine;
  const today = todayJakarta();
  const late = d.due_date && d.due_date < today && d.status !== "SELESAI";
  const title = d.incoming?.is_confidential ? "Disposisi surat rahasia" : d.incoming?.subject ?? "Disposisi";

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-mute"><Link href="/disposisi" className="hover:text-ink hover:underline">Disposisi</Link> <span aria-hidden>/</span> <span aria-current="page">Detail</span></nav>
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />

      <LetterHeader eyebrow="Disposisi" title={title}
        badges={<><StatusBadge value={d.status} /><StatusBadge value={d.priority} />{late && <StatusBadge value="MENDESAK" tone="bad" />}</>}
        meta={[{ icon: User, text: `Penerima: ${names[d.assigned_to] ?? "-"}` }, { icon: User, text: `Diberikan oleh ${names[d.created_by] ?? "-"}` }, { icon: CalendarClock, text: d.due_date ? `Tenggat ${formatDate(d.due_date)}${late ? " (lewat)" : ""}` : "Tanpa tenggat" }]}
        actions={d.incoming && canOpenLetter ? <Link href={`/surat-masuk/${d.incoming.id}`} className={buttonClass("secondary", "gap-2")}><ExternalLink className="h-4 w-4" aria-hidden />Buka surat sumber</Link> : undefined} />

      <ProgressTrack steps={DISPOSITION_STEPS} current={d.status} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Card title="Instruksi">
            <div className="flex gap-4">
              <Avatar name={names[d.created_by] ?? "?"} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-ink-mute">{names[d.created_by] ?? "Pemberi disposisi"} menginstruksikan:</p>
                <blockquote className="mt-2 whitespace-pre-wrap rounded-lg border-l-4 border-brass bg-brass-soft/50 px-4 py-3 font-display text-[16px] leading-7 text-ink">{d.instruction}</blockquote>
              </div>
            </div>
            {d.completed_note && (
              <div className="mt-5 rounded-lg bg-ok-bg px-4 py-3"><p className="text-xs font-semibold text-ok">Hasil tindak lanjut</p><p className="mt-1 whitespace-pre-wrap text-sm text-ink">{d.completed_note}</p></div>
            )}
            <div className="mt-5 border-t border-line pt-4">
              <DefinitionList items={[{ label: "Surat sumber", value: d.incoming?.is_confidential ? "Surat rahasia" : d.incoming?.subject }, { label: "Pengirim surat", value: d.incoming?.is_confidential ? null : d.incoming?.sender }, { label: "Dibuat", value: formatDate(d.created_at) }, { label: "Penerima", value: names[d.assigned_to] }]} />
            </div>
          </Card>

          {nexts.length > 0 && (
            <Card title="Tanggapi disposisi">
              <p className="mb-4 text-sm text-ink-soft">{HELP[d.status]}</p>
              <form action={respondDisposition} className="space-y-4"><input type="hidden" name="id" value={d.id} />
                <Field label="Catatan" htmlFor="note" hint="Wajib diisi saat menyelesaikan disposisi."><textarea id="note" name="note" rows={4} className={inputClass} maxLength={2000} placeholder="Tuliskan perkembangan atau hasil tindak lanjut" /></Field>
                <div className="flex flex-wrap gap-2.5">{nexts.map((n) => <SubmitButton key={n} name="to" value={n} variant={n === "SELESAI" ? "primary" : "secondary"}>{LABEL[n]}</SubmitButton>)}</div>
              </form>
            </Card>
          )}
        </div>

        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <Card title="Riwayat tanggapan">
            <Timeline items={[...resp.map((r) => ({ id: r.id as string, title: `Status: ${String(r.status_after).replaceAll("_", " ").toLowerCase()}`, note: r.note as string | null, at: r.created_at as string, by: names[r.author_id] })), { id: "c", title: "Disposisi dibuat", at: d.created_at as string, by: names[d.created_by] }]} />
          </Card>
        </aside>
      </div>
    </div>
  );
}