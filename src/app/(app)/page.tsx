import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, Flash, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { firstParam, formatDate, formatDateTime } from "@/lib/utils";
import Link from "next/link";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const s = await requireSession();
  const sb = createClient();
  const p = (x: Parameters<typeof can>[1]) => can(s.permissions, x);
  const today = new Date().toISOString().slice(0, 10);
  const cnt = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

  const [inTotal, inPending, outTotal, outWaiting, myOpen, myOverdue, archived, toNumber] = await Promise.all([
    p("letters.incoming.view") ? cnt(sb.from("incoming_letters").select("id", { count: "exact", head: true })) : 0,
    p("letters.incoming.view") ? cnt(sb.from("incoming_letters").select("id", { count: "exact", head: true }).in("status", ["DICATAT", "DIVERIFIKASI"])) : 0,
    p("letters.outgoing.view") || p("letters.outgoing.create") ? cnt(sb.from("outgoing_letters").select("id", { count: "exact", head: true })) : 0,
    p("letters.outgoing.approve") ? cnt(sb.from("outgoing_letters").select("id", { count: "exact", head: true }).in("status", ["DIAJUKAN", "DITINJAU"])) : 0,
    cnt(sb.from("letter_dispositions").select("id", { count: "exact", head: true }).eq("assigned_to", s.userId).neq("status", "SELESAI")),
    cnt(sb.from("letter_dispositions").select("id", { count: "exact", head: true }).eq("assigned_to", s.userId).neq("status", "SELESAI").lt("due_date", today)),
    p("archives.view") ? cnt(sb.from("archive_records").select("id", { count: "exact", head: true })) : 0,
    p("letters.outgoing.update") ? cnt(sb.from("outgoing_letters").select("id", { count: "exact", head: true }).eq("status", "DISETUJUI")) : 0,
  ]);

  const { data: myDisp } = await sb.from("letter_dispositions")
    .select("id, instruction, priority, due_date, status, incoming:incoming_letters(subject, is_confidential)")
    .eq("assigned_to", s.userId).neq("status", "SELESAI").order("due_date", { ascending: true, nullsFirst: false }).limit(5);

  const { data: activity } = p("audit_logs.view")
    ? await sb.from("audit_logs").select("id, action, entity_type, created_at").order("created_at", { ascending: false }).limit(6)
    : { data: [] as { id: number; action: string; entity_type: string; created_at: string }[] };

  const isPrincipal = p("letters.outgoing.approve");
  const isTU = p("letters.incoming.create");

  return (
    <>
      <PageHeader title={`Halo, ${s.fullName.split(" ")[0]}`} description={isPrincipal ? "Ringkasan surat yang perlu dipantau dan disetujui." : isTU ? "Ringkasan surat yang perlu dicatat dan diproses." : "Disposisi dan tugas yang menjadi tanggung jawab Anda."} />
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {p("letters.incoming.view") && <StatCard label="Surat masuk" value={inTotal} hint={`${inPending} perlu diproses`} href="/surat-masuk" />}
        {(p("letters.outgoing.view") || p("letters.outgoing.create")) && <StatCard label="Surat keluar" value={outTotal} href="/surat-keluar" />}
        {isPrincipal && <StatCard label="Menunggu persetujuan" value={outWaiting} tone={outWaiting ? "warn" : undefined} href="/surat-keluar?status=DIAJUKAN" />}
        {p("letters.outgoing.update") && <StatCard label="Siap diberi nomor" value={toNumber} hint="Disetujui, belum final" href="/surat-keluar?status=DISETUJUI" />}
        <StatCard label="Disposisi saya" value={myOpen} hint={myOverdue ? `${myOverdue} lewat tenggat` : "Belum selesai"} tone={myOverdue ? "bad" : undefined} href="/disposisi" />
        {p("archives.view") && <StatCard label="Arsip" value={archived} href="/arsip" />}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Disposisi yang perlu ditindaklanjuti" action={<Link href="/disposisi" className="text-xs text-navy-700 underline">Lihat semua</Link>}>
          {myDisp && myDisp.length ? (
            <ul className="divide-y divide-line">
              {myDisp.map((d: any) => (
                <li key={d.id} className="py-3 first:pt-0 last:pb-0">
                  <Link href={`/disposisi/${d.id}`} className="block rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600">
                    <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{d.incoming?.is_confidential ? "Surat rahasia" : d.incoming?.subject ?? "Surat"}</span><StatusBadge value={d.status} /></div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-ink-soft">{d.instruction}</p>
                    <p className="mt-0.5 text-xs text-ink-mute">Tenggat: {formatDate(d.due_date)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="Tidak ada disposisi terbuka" description="Disposisi baru dari kepala sekolah akan muncul di sini." />}
        </Card>
        {p("audit_logs.view") ? (
          <Card title="Aktivitas terbaru" action={<Link href="/audit-log" className="text-xs text-navy-700 underline">Audit log</Link>}>
            {activity && activity.length ? (
              <ul className="space-y-2.5">{activity.map((a) => (
                <li key={a.id} className="flex items-baseline justify-between gap-3 text-sm"><span className="truncate">{a.action.replaceAll("_", " ").toLowerCase()}</span><span className="shrink-0 text-xs text-ink-mute">{formatDateTime(a.created_at)}</span></li>
              ))}</ul>
            ) : <EmptyState title="Belum ada aktivitas" />}
          </Card>
        ) : (
          <Card title="Pintasan">
            <ul className="space-y-2 text-sm">
              <li><Link className="text-navy-700 underline" href="/disposisi">Disposisi saya</Link></li>
              <li><Link className="text-navy-700 underline" href="/agenda">Agenda dan tenggat</Link></li>
              <li><Link className="text-navy-700 underline" href="/notifikasi">Notifikasi</Link></li>
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
