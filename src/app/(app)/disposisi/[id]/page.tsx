import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getProfileMap } from "@/lib/data";
import { Card, DefinitionList, Field, Flash, inputClass, PageHeader, StatusBadge, SubmitButton, Timeline } from "@/components/ui";
import { firstParam, formatDate } from "@/lib/utils";
import { DISPOSITION_TRANSITIONS } from "@/lib/workflow";
import { respondDisposition } from "@/features/disposition-actions";

export const metadata = { title: "Detail disposisi" };
const LABEL: Record<string, string> = { DITERIMA: "Terima disposisi", DALAM_PROSES: "Mulai kerjakan", SELESAI: "Tandai selesai" };

export default async function Page({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | string[] | undefined> }) {
  const s = await requireSession();
  const sb = createClient();
  const { data: d } = await sb.from("letter_dispositions").select("*, incoming:incoming_letters(id, subject, sender, is_confidential, status)").eq("id", params.id).maybeSingle();
  if (!d) notFound();
  const { data: resp } = await sb.from("disposition_responses").select("id, author_id, note, status_after, created_at").eq("disposition_id", d.id).order("created_at", { ascending: false });
  const names = await getProfileMap(sb, [d.assigned_to, d.created_by, ...(resp ?? []).map((r: any) => r.author_id)]);
  const mine = d.assigned_to === s.userId && can(s.permissions, "letters.disposition.respond");
  const nexts = mine ? DISPOSITION_TRANSITIONS[d.status] ?? [] : [];
  const canOpenLetter = can(s.permissions, "letters.incoming.view") || mine;
  return (
    <>
      <PageHeader title={d.incoming?.is_confidential ? "Disposisi surat rahasia" : d.incoming?.subject ?? "Disposisi"} crumbs={[{ label: "Disposisi", href: "/disposisi" }, { label: "Detail" }]} />
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card title="Instruksi">
            <div className="mb-4 flex gap-2"><StatusBadge value={d.status} /><StatusBadge value={d.priority} /></div>
            <p className="mb-5 whitespace-pre-wrap text-sm">{d.instruction}</p>
            <DefinitionList items={[{ label: "Penerima", value: names[d.assigned_to] }, { label: "Diberikan oleh", value: names[d.created_by] }, { label: "Tenggat", value: formatDate(d.due_date) }, { label: "Hasil tindak lanjut", value: d.completed_note }]} />
            {d.incoming && canOpenLetter && <p className="mt-5 text-sm"><Link className="text-navy-700 underline" href={`/surat-masuk/${d.incoming.id}`}>Buka surat sumber</Link></p>}
          </Card>
          {nexts.length > 0 && (
            <Card title="Tanggapi disposisi">
              <form action={respondDisposition} className="space-y-4"><input type="hidden" name="id" value={d.id} />
                <Field label="Catatan" htmlFor="note" hint="Wajib diisi saat menyelesaikan disposisi."><textarea id="note" name="note" rows={3} className={inputClass} maxLength={2000} /></Field>
                <div className="flex flex-wrap gap-2">{nexts.map((n) => <SubmitButton key={n} name="to" value={n} variant={n === "SELESAI" ? "primary" : "secondary"}>{LABEL[n]}</SubmitButton>)}</div>
              </form>
            </Card>
          )}
        </div>
        <Card title="Riwayat tanggapan"><Timeline items={[...(resp ?? []).map((r: any) => ({ id: r.id, title: `Status: ${r.status_after.replaceAll("_", " ").toLowerCase()}`, note: r.note, at: r.created_at, by: names[r.author_id] })), { id: "c", title: "Disposisi dibuat", at: d.created_at, by: names[d.created_by] }]} /></Card>
      </div>
    </>
  );
}
