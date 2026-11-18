import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Agenda" };

type Item = { key: string; date: string; title: string; kind: string; href: string; status?: string };

export default async function Page() {
  const s = await requireSession();
  const sb = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const items: Item[] = [];
  const { data: disp } = await sb.from("letter_dispositions").select("id, due_date, status, instruction, assigned_to, incoming:incoming_letters(subject, is_confidential)").not("due_date", "is", null).neq("status", "SELESAI").order("due_date").limit(100);
  (disp ?? []).filter((d: any) => d.assigned_to === s.userId || can(s.permissions, "letters.disposition.create")).forEach((d: any) =>
    items.push({ key: "d" + d.id, date: d.due_date, title: `Tenggat disposisi: ${d.incoming?.is_confidential ? "surat rahasia" : d.incoming?.subject ?? d.instruction}`, kind: "Disposisi", href: `/disposisi/${d.id}`, status: d.status }));
  if (can(s.permissions, "letters.incoming.update")) {
    const { data: inc } = await sb.from("incoming_letters").select("id, subject, received_date, status, is_confidential").in("status", ["DICATAT", "DIVERIFIKASI"]).order("received_date").limit(50);
    (inc ?? []).forEach((l: any) => items.push({ key: "i" + l.id, date: l.received_date, title: `Perlu diproses: ${l.is_confidential ? "surat rahasia" : l.subject}`, kind: "Surat masuk", href: `/surat-masuk/${l.id}`, status: l.status }));
  }
  if (can(s.permissions, "letters.outgoing.approve")) {
    const { data: out } = await sb.from("outgoing_letters").select("id, subject, letter_date, status, is_confidential").in("status", ["DIAJUKAN", "DITINJAU"]).order("letter_date").limit(50);
    (out ?? []).forEach((l: any) => items.push({ key: "o" + l.id, date: l.letter_date, title: `Menunggu persetujuan: ${l.is_confidential ? "surat rahasia" : l.subject}`, kind: "Surat keluar", href: `/surat-keluar/${l.id}`, status: l.status }));
  }
  items.sort((a, b) => a.date.localeCompare(b.date));
  const groups = new Map<string, Item[]>();
  items.forEach((i) => { const g = i.date < today ? "Lewat tenggat / tertunda" : i.date === today ? "Hari ini" : "Mendatang"; groups.set(g, [...(groups.get(g) ?? []), i]); });
  const order = ["Lewat tenggat / tertunda", "Hari ini", "Mendatang"];
  return (
    <>
      <PageHeader title="Agenda" description="Tenggat disposisi dan pekerjaan surat yang menunggu tindakan." />
      {items.length === 0 ? <Card><EmptyState title="Tidak ada agenda" description="Tenggat disposisi dan surat yang menunggu tindakan akan muncul di sini." /></Card> : (
        <div className="space-y-6">{order.filter((g) => groups.has(g)).map((g) => (
          <Card key={g} title={g}><ul className="divide-y divide-line">{groups.get(g)!.map((i) => (
            <li key={i.key} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0"><Link href={i.href} className="text-sm font-medium text-navy-800 hover:underline">{i.title}</Link><p className="mt-0.5 text-xs text-ink-mute">{i.kind} - {formatDate(i.date)}</p></div>
              {i.status && <StatusBadge value={i.status} />}
            </li>))}</ul></Card>))}</div>
      )}
    </>
  );
}
