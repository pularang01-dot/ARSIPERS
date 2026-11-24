import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getProfileMap } from "@/lib/data";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { Avatar } from "@/components/letters";
import { KpiCard } from "@/components/dashboard";
import { cn, firstParam, todayJakarta } from "@/lib/utils";
import { AlarmClock, CalendarClock, CalendarDays, ChevronLeft, ChevronRight, Hash, Inbox, MailOpen, Pencil, Send, Split } from "lucide-react";

export const metadata = { title: "Agenda" };
type Row = Record<string, any>;

const EDGE: Record<string, string> = { MENDESAK: "border-l-bad", TINGGI: "border-l-brass", NORMAL: "border-l-navy-600", RENDAH: "border-l-line-strong" };
const DAY_ABBR = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const dayDiff = (a: string, b: string) => Math.round((new Date(a + "T00:00:00Z").getTime() - new Date(b + "T00:00:00Z").getTime()) / 86400000);
const shiftMonth = (ym: string, delta: number) => { const [y, m] = ym.split("-").map(Number); const d = new Date(Date.UTC(y, m - 1 + delta, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const s = await requireSession();
  const sb = createClient();
  const p = (x: Parameters<typeof can>[1]) => can(s.permissions, x);
  const today = todayJakarta();
  const bulanParam = firstParam(searchParams.bulan);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(bulanParam) ? bulanParam : today.slice(0, 7);

  const none = { data: [] as Row[] };
  const [dispQ, incQ, apprQ, finQ, revQ] = await Promise.all([
    sb.from("letter_dispositions").select("id, due_date, status, priority, instruction, assigned_to, incoming:incoming_letters(subject, is_confidential)").not("due_date", "is", null).neq("status", "SELESAI").order("due_date").limit(200),
    p("letters.incoming.update") ? sb.from("incoming_letters").select("id, subject, sender, received_date, status, is_confidential").in("status", ["DICATAT", "DIVERIFIKASI"]).order("received_date").limit(30) : none,
    p("letters.outgoing.approve") ? sb.from("outgoing_letters").select("id, subject, recipient, letter_date, status, is_confidential").in("status", ["DIAJUKAN", "DITINJAU"]).order("letter_date").limit(30) : none,
    p("letters.outgoing.update") ? sb.from("outgoing_letters").select("id, subject, recipient, letter_date, is_confidential").eq("status", "DISETUJUI").order("letter_date").limit(30) : none,
    p("letters.outgoing.create") ? sb.from("outgoing_letters").select("id, subject, recipient, letter_date, is_confidential").eq("status", "PERLU_REVISI").eq("created_by", s.userId).limit(30) : none,
  ]);

  const disp = ((dispQ.data ?? []) as Row[]).filter((d) => d.assigned_to === s.userId || p("letters.disposition.create"));
  const names = await getProfileMap(sb, disp.map((d) => d.assigned_to as string));

  // ---- Menunggu tindakan (tanpa tenggat) ----
  type Pending = { id: string; href: string; icon: React.ComponentType<{ className?: string }>; title: string; meta: string; badge: string; since: string };
  const subj = (c: boolean, t: string) => (c ? "Surat rahasia" : t);
  const pending: Pending[] = [];
  ((apprQ.data ?? []) as Row[]).forEach((l) => pending.push({ id: "a" + l.id, href: `/surat-keluar/${l.id}`, icon: Send, title: subj(l.is_confidential, l.subject), meta: `Menunggu persetujuan - kepada ${l.recipient}`, badge: l.status, since: l.letter_date }));
  ((incQ.data ?? []) as Row[]).forEach((l) => pending.push({ id: "i" + l.id, href: `/surat-masuk/${l.id}`, icon: MailOpen, title: subj(l.is_confidential, l.subject), meta: `Perlu diproses - dari ${l.sender}`, badge: l.status, since: l.received_date }));
  ((finQ.data ?? []) as Row[]).forEach((l) => pending.push({ id: "f" + l.id, href: `/surat-keluar/${l.id}`, icon: Hash, title: subj(l.is_confidential, l.subject), meta: `Siap diberi nomor - kepada ${l.recipient}`, badge: "DISETUJUI", since: l.letter_date }));
  ((revQ.data ?? []) as Row[]).forEach((l) => pending.push({ id: "r" + l.id, href: `/surat-keluar/${l.id}`, icon: Pencil, title: subj(l.is_confidential, l.subject), meta: `Perlu revisi - kepada ${l.recipient}`, badge: "PERLU_REVISI", since: l.letter_date }));
  pending.sort((a, b) => a.since.localeCompare(b.since));

  // ---- Statistik ----
  const overdue = disp.filter((d) => d.due_date < today).length;
  const todayCount = disp.filter((d) => d.due_date === today).length;
  const week = disp.filter((d) => d.due_date > today && dayDiff(d.due_date, today) <= 7).length;

  // ---- Linimasa tenggat ----
  const byDate = new Map<string, Row[]>();
  disp.forEach((d) => byDate.set(d.due_date as string, [...(byDate.get(d.due_date as string) ?? []), d]));
  const dates = Array.from(byDate.keys()).sort();
  const rel = (d: string) => { const n = dayDiff(d, today); return n < 0 ? { text: `Lewat ${Math.abs(n)} hari`, cls: "text-bad" } : n === 0 ? { text: "Hari ini", cls: "text-brass-dark" } : n === 1 ? { text: "Besok", cls: "text-brass-dark" } : { text: `${n} hari lagi`, cls: "text-ink-mute" }; };

  // ---- Kalender bulanan ----
  const [cy, cm] = month.split("-").map(Number);
  const first = new Date(Date.UTC(cy, cm - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7; // Senin = 0
  const daysInMonth = new Date(Date.UTC(cy, cm, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  const key = (d: number) => `${month}-${String(d).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Agenda" description="Tenggat disposisi dan pekerjaan surat yang menunggu tindakan." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Lewat tenggat" value={overdue} hint={overdue ? "Perlu segera ditindaklanjuti" : "Tidak ada yang terlambat"} icon={AlarmClock} tone={overdue ? "bad" : "default"} />
        <KpiCard label="Jatuh tempo hari ini" value={todayCount} icon={CalendarClock} tone={todayCount ? "warn" : "default"} />
        <KpiCard label="7 hari ke depan" value={week} hint="Disposisi dengan tenggat" icon={CalendarDays} />
        <KpiCard label="Menunggu tindakan" value={pending.length} hint="Surat yang perlu diproses" icon={Inbox} tone={pending.length ? "warn" : "default"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <Card title="Linimasa tenggat disposisi">
            {!dates.length ? <EmptyState title="Tidak ada tenggat" description="Disposisi yang memiliki tanggal tenggat akan tampil di sini, urut dari yang paling dekat." /> : (
              <ol className="space-y-6">
                {dates.map((d) => {
                  const r = rel(d); const dt = new Date(d + "T00:00:00Z");
                  return (
                    <li key={d} id={`tgl-${d}`} className="scroll-mt-24 grid grid-cols-[64px_1fr] gap-4">
                      <div className={cn("flex h-16 w-16 flex-col items-center justify-center rounded-xl border", d < today ? "border-bad/30 bg-bad-bg" : d === today ? "border-brass/50 bg-brass-soft" : "border-line bg-surface")}>
                        <span className="font-display text-2xl font-semibold leading-none tabular-nums text-navy-900">{dt.getUTCDate()}</span>
                        <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-ink-soft">{new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" }).format(dt)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="mb-2 text-sm"><span className="font-medium text-ink">{new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "UTC" }).format(dt)}</span> <span className={cn("ml-2 text-xs font-semibold", r.cls)}>{r.text}</span></p>
                        <ul className="space-y-2.5">
                          {(byDate.get(d) ?? []).map((x) => (
                            <li key={x.id as string}>
                              <Link href={`/disposisi/${x.id}`} className={cn("group flex items-center gap-3 rounded-lg border border-l-4 border-line bg-white p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600", EDGE[x.priority as string] ?? "border-l-navy-600")}>
                                <Split className="h-[18px] w-[18px] shrink-0 text-navy-700" aria-hidden />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-ink group-hover:text-navy-800">{x.incoming?.is_confidential ? "Surat rahasia" : x.incoming?.subject ?? "Surat"}</p>
                                  <p className="mt-0.5 line-clamp-1 text-xs text-ink-soft">{x.instruction}</p>
                                </div>
                                <span className="hidden items-center gap-2 text-xs text-ink-soft sm:flex"><Avatar name={names[x.assigned_to as string] ?? "?"} size={24} />{names[x.assigned_to as string] ?? "-"}</span>
                                <StatusBadge value={x.status as string} />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>

          <Card title="Menunggu tindakan">
            {!pending.length ? <EmptyState title="Semua sudah beres" description="Surat yang perlu diproses, disetujui, atau direvisi akan muncul di sini." /> : (
              <ul className="-my-1 divide-y divide-line">
                {pending.map((it) => {
                  const Icon = it.icon; const age = dayDiff(today, it.since);
                  return (
                    <li key={it.id}>
                      <Link href={it.href} className="group flex items-center gap-3.5 rounded-lg px-2 py-3 transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700" aria-hidden><Icon className="h-[18px] w-[18px]" /></span>
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink group-hover:text-navy-800">{it.title}</p><p className="mt-0.5 truncate text-xs text-ink-mute">{it.meta}</p></div>
                        <div className="flex shrink-0 flex-col items-end gap-1"><StatusBadge value={it.badge} /><span className={cn("text-xs tabular-nums", age >= 7 ? "font-semibold text-bad" : age >= 3 ? "font-medium text-brass-dark" : "text-ink-mute")}>{age <= 0 ? "Hari ini" : `${age} hari lalu`}</span></div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold capitalize text-navy-900">{monthLabel}</h2>
              <div className="flex gap-1">
                <Link href={`/agenda?bulan=${shiftMonth(month, -1)}`} aria-label="Bulan sebelumnya" className="flex h-8 w-8 items-center justify-center rounded-md border border-line-strong text-ink-soft hover:bg-surface"><ChevronLeft className="h-4 w-4" /></Link>
                <Link href={`/agenda?bulan=${shiftMonth(month, 1)}`} aria-label="Bulan berikutnya" className="flex h-8 w-8 items-center justify-center rounded-md border border-line-strong text-ink-soft hover:bg-surface"><ChevronRight className="h-4 w-4" /></Link>
              </div>
            </div>
            <table className="w-full table-fixed text-center">
              <caption className="sr-only">Kalender {monthLabel}. Hari bertanda titik memiliki tenggat disposisi.</caption>
              <thead><tr>{DAY_ABBR.map((d) => <th key={d} scope="col" className="pb-2 text-[11px] font-medium uppercase tracking-wide text-ink-mute">{d}</th>)}</tr></thead>
              <tbody>
                {Array.from({ length: cells.length / 7 }, (_, w) => (
                  <tr key={w}>
                    {cells.slice(w * 7, w * 7 + 7).map((d, i) => {
                      if (d === null) return <td key={i} />;
                      const k = key(d); const items = byDate.get(k); const isToday = k === today; const late = !!items && k < today;
                      const inner = (
                        <span className={cn("mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-lg text-sm tabular-nums", isToday ? "bg-navy-800 font-semibold text-white" : items ? "font-medium text-ink hover:bg-surface" : "text-ink-soft")}>
                          {d}
                          {items && <span className={cn("mt-0.5 h-1 w-1 rounded-full", isToday ? "bg-brass-soft" : late ? "bg-bad" : "bg-brass")} aria-hidden />}
                        </span>
                      );
                      return <td key={i} className="p-0.5">{items ? <a href={`#tgl-${k}`} aria-label={`${d}, ${items.length} tenggat`}>{inner}</a> : inner}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-ink-mute">
              <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-navy-800" aria-hidden />Hari ini</li>
              <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brass" aria-hidden />Ada tenggat</li>
              <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-bad" aria-hidden />Terlambat</li>
            </ul>
            {month !== today.slice(0, 7) && <Link href="/agenda" className="mt-3 block text-center text-xs font-medium text-navy-700 hover:underline">Kembali ke bulan ini</Link>}
          </Card>
        </aside>
      </div>
    </div>
  );
}