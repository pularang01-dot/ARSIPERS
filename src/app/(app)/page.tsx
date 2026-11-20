import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getProfileMap } from "@/lib/data";
import { Card, Flash } from "@/components/ui";
import { ActionList, BarList, Hero, KpiCard, VolumeChart, type ActionItem, type HeroAction } from "@/components/dashboard";
import { auditLabel, INCOMING_STEPS, OUTGOING_STEPS, STATUS_LABEL } from "@/lib/constants";
import { firstParam, formatDate, formatDateTime, todayJakarta } from "@/lib/utils";
import { Archive, FileCheck, Hash, Inbox, MailOpen, Pencil, Send, Split } from "lucide-react";

export const metadata = { title: "Dashboard" };

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
type Row = Record<string, any>;
const none = { data: [] as Row[] };

export default async function Dashboard({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const s = await requireSession();
  const sb = createClient();
  const p = (x: Parameters<typeof can>[1]) => can(s.permissions, x);
  const today = todayJakarta();
  const [ty, tm] = today.split("-").map(Number);

  // 6 bulan terakhir (termasuk bulan ini)
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(ty, tm - 1 - i, 1));
    months.push({ key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`, label: MONTH_SHORT[d.getUTCMonth()] });
  }
  const thisMonth = months[5].key;

  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date())) % 24;
  const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";
  const dateLabel = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date());

  const canRespond = p("letters.disposition.respond");
  const [incAll, outAll, myDisp, approvals, toVerify, toFinalize, myRevisions, activity] = await Promise.all([
    p("letters.incoming.view") ? sb.from("incoming_letters").select("status, received_date").limit(5000) : none,
    p("letters.outgoing.view") ? sb.from("outgoing_letters").select("status, letter_date").limit(5000) : none,
    (canRespond
      ? sb.from("letter_dispositions").select("id, instruction, due_date, status, incoming:incoming_letters(subject, is_confidential)").eq("assigned_to", s.userId).neq("status", "SELESAI").limit(30)
      : sb.from("letter_dispositions").select("id, instruction, due_date, status, incoming:incoming_letters(subject, is_confidential)").neq("status", "SELESAI").limit(30)),
    p("letters.outgoing.approve") ? sb.from("outgoing_letters").select("id, subject, recipient, letter_date, status, is_confidential").in("status", ["DIAJUKAN", "DITINJAU"]).order("letter_date").limit(20) : none,
    p("letters.incoming.update") ? sb.from("incoming_letters").select("id, subject, sender, received_date, status, is_confidential").in("status", ["DICATAT", "DIVERIFIKASI"]).order("received_date").limit(20) : none,
    p("letters.outgoing.update") ? sb.from("outgoing_letters").select("id, subject, recipient, letter_date, is_confidential").eq("status", "DISETUJUI").order("letter_date").limit(20) : none,
    p("letters.outgoing.create") ? sb.from("outgoing_letters").select("id, subject, recipient, letter_date, is_confidential").eq("status", "PERLU_REVISI").eq("created_by", s.userId).limit(20) : none,
    p("audit_logs.view")
      ? sb.from("audit_logs").select("id, actor_id, action, created_at").not("action", "in", "(AUTH_LOGIN,AUTH_LOGIN_GOOGLE,AUTH_LOGOUT,FILE_DOWNLOAD)").order("created_at", { ascending: false }).limit(7)
      : none,
  ]);

  const inc = (incAll.data ?? []) as Row[];
  const out = (outAll.data ?? []) as Row[];
  const dispRows = (myDisp.data ?? []) as Row[];
  const apprRows = (approvals.data ?? []) as Row[];
  const verifyRows = (toVerify.data ?? []) as Row[];
  const finalRows = (toFinalize.data ?? []) as Row[];
  const reviseRows = (myRevisions.data ?? []) as Row[];
  const actRows = (activity.data ?? []) as Row[];
  const names = await getProfileMap(sb, actRows.map((a) => a.actor_id));

  // ----- agregasi -----
  const bucket = (rows: Row[], key: string) => months.map((m) => rows.filter((r) => String(r[key]).slice(0, 7) === m.key).length);
  const incByMonth = bucket(inc, "received_date");
  const outByMonth = bucket(out, "letter_date");
  const tally = (rows: Row[], steps: string[]) => steps.map((st) => ({ label: STATUS_LABEL[st] ?? st, value: rows.filter((r) => r.status === st).length }));
  const overdue = dispRows.filter((d) => d.due_date && d.due_date < today).length;

  // ----- daftar tindakan (urut: lewat tenggat, segera, lalu tanggal) -----
  const subj = (conf: boolean, text: string) => (conf ? "Surat rahasia" : text);
  const daysUntil = (d: string) => Math.round((new Date(d + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86400000);
  type Ranked = ActionItem & { rank: number; sort: string };
  const actions: Ranked[] = [];
  dispRows.forEach((d) => {
    const left = d.due_date ? daysUntil(d.due_date) : null;
    const overdueNow = left !== null && left < 0;
    actions.push({
      id: "d" + d.id, href: `/disposisi/${d.id}`, icon: Split, title: subj(!!d.incoming?.is_confidential, d.incoming?.subject ?? "Surat"),
      meta: d.instruction, badge: d.status, overdue: overdueNow, soon: left !== null && left >= 0 && left <= 2,
      dueLabel: d.due_date ? (overdueNow ? `Lewat ${Math.abs(left!)} hari` : left === 0 ? "Hari ini" : `Tenggat ${formatDate(d.due_date)}`) : undefined,
      rank: overdueNow ? 0 : left !== null && left <= 2 ? 1 : 3, sort: d.due_date ?? "9999",
    });
  });
  apprRows.forEach((l) => actions.push({ id: "a" + l.id, href: `/surat-keluar/${l.id}`, icon: FileCheck, title: subj(l.is_confidential, l.subject), meta: `Menunggu persetujuan - kepada ${l.recipient}`, badge: l.status, rank: 2, sort: l.letter_date }));
  finalRows.forEach((l) => actions.push({ id: "f" + l.id, href: `/surat-keluar/${l.id}`, icon: Hash, title: subj(l.is_confidential, l.subject), meta: `Disetujui - siap diberi nomor - kepada ${l.recipient}`, badge: "DISETUJUI", rank: 2, sort: l.letter_date }));
  reviseRows.forEach((l) => actions.push({ id: "r" + l.id, href: `/surat-keluar/${l.id}`, icon: Pencil, title: subj(l.is_confidential, l.subject), meta: `Perlu revisi - kepada ${l.recipient}`, badge: "PERLU_REVISI", rank: 1, sort: l.letter_date }));
  verifyRows.forEach((l) => actions.push({ id: "v" + l.id, href: `/surat-masuk/${l.id}`, icon: MailOpen, title: subj(l.is_confidential, l.subject), meta: `Perlu diproses - dari ${l.sender}`, badge: l.status, rank: 3, sort: l.received_date }));
  actions.sort((a, b) => a.rank - b.rank || a.sort.localeCompare(b.sort));
  const topActions = actions.slice(0, 7);

  // ----- KPI (maksimal 4, sesuai peran) -----
  type Kpi = { key: string; label: string; value: number; hint?: string; icon: any; tone?: "warn" | "bad"; href?: string };
  const kpis: Kpi[] = [];
  if (p("letters.outgoing.approve")) kpis.push({ key: "appr", label: "Menunggu persetujuan", value: apprRows.length, hint: apprRows.length ? "Surat keluar perlu keputusan Anda" : "Tidak ada antrean", icon: FileCheck, tone: apprRows.length ? "warn" : undefined, href: "/surat-keluar?status=DIAJUKAN" });
  if (p("letters.incoming.update")) kpis.push({ key: "ver", label: "Surat masuk perlu diproses", value: verifyRows.length, hint: "Dicatat atau diverifikasi", icon: Inbox, tone: verifyRows.length ? "warn" : undefined, href: "/surat-masuk" });
  if (p("letters.outgoing.update")) kpis.push({ key: "fin", label: "Siap diberi nomor", value: finalRows.length, hint: "Sudah disetujui, belum final", icon: Hash, href: "/surat-keluar?status=DISETUJUI" });
  kpis.push({ key: "disp", label: canRespond ? "Disposisi untuk saya" : "Disposisi berjalan", value: dispRows.length, hint: overdue ? `${overdue} lewat tenggat` : "Belum selesai", icon: Split, tone: overdue ? "bad" : undefined, href: "/disposisi" });
  if (p("letters.incoming.view")) kpis.push({ key: "in", label: "Surat masuk bulan ini", value: incByMonth[5], hint: `${inc.length} surat tercatat`, icon: MailOpen, href: "/surat-masuk" });
  if (p("letters.outgoing.view")) kpis.push({ key: "out", label: "Surat keluar bulan ini", value: outByMonth[5], hint: `${out.length} surat tercatat`, icon: Send, href: "/surat-keluar" });
  if (p("archives.view")) kpis.push({ key: "arc", label: "Surat diarsipkan", value: inc.filter((r) => r.status === "DIARSIPKAN").length + out.filter((r) => r.status === "DIARSIPKAN").length, hint: "Masuk dan keluar", icon: Archive, href: "/arsip" });
  const shownKpis = kpis.slice(0, 4);

  // ----- Hero -----
  const summaryParts: string[] = [];
  if (apprRows.length) summaryParts.push(`${apprRows.length} surat menunggu persetujuan Anda`);
  if (verifyRows.length) summaryParts.push(`${verifyRows.length} surat masuk perlu diproses`);
  if (finalRows.length) summaryParts.push(`${finalRows.length} surat siap diberi nomor`);
  if (dispRows.length) summaryParts.push(`${dispRows.length} disposisi ${canRespond ? "menunggu tindak lanjut Anda" : "sedang berjalan"}`);
  const summary = summaryParts.length ? summaryParts.slice(0, 3).join(", ") + "." : "Tidak ada pekerjaan yang menunggu. Semua sudah beres.";
  const heroActions: HeroAction[] = [];
  if (p("letters.incoming.create")) heroActions.push({ href: "/surat-masuk/baru", label: "Catat surat masuk", primary: true });
  if (p("letters.outgoing.create")) heroActions.push({ href: "/surat-keluar/baru", label: "Buat surat keluar", primary: !p("letters.incoming.create") });
  if (p("letters.outgoing.approve") && apprRows.length) heroActions.push({ href: "/surat-keluar?status=DIAJUKAN", label: `Tinjau ${apprRows.length} surat`, primary: true });
  if (canRespond) heroActions.push({ href: "/disposisi", label: "Buka disposisi saya", primary: true });

  const firstName = s.fullName.split(" ")[0];
  return (
    <div className="space-y-6">
      <Hero greeting={greeting} name={firstName} dateLabel={dateLabel} summary={summary} actions={heroActions.slice(0, 3)} />
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {shownKpis.map((k) => <KpiCard key={k.key} label={k.label} value={k.value} hint={k.hint} icon={k.icon} tone={k.tone} href={k.href} />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card title="Perlu tindakan Anda" action={actions.length > 7 ? <span className="text-xs text-ink-mute">{actions.length} item, 7 teratas</span> : undefined}>
            <ActionList items={topActions} emptyTitle="Tidak ada yang menunggu" emptyText="Pekerjaan baru seperti disposisi, persetujuan, atau surat masuk akan muncul di sini." />
          </Card>
          {(p("letters.incoming.view") || p("letters.outgoing.view")) && (
            <Card title="Volume surat, 6 bulan terakhir">
              <VolumeChart labels={months.map((m) => m.label)} incoming={incByMonth} outgoing={outByMonth} />
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {p("letters.incoming.view") && (
            <Card title="Alur surat masuk" action={<Link href="/surat-masuk" className="text-xs font-medium text-navy-700 hover:underline">Lihat semua</Link>}>
              <BarList rows={tally(inc, INCOMING_STEPS).map((r, i) => ({ ...r, tone: i === INCOMING_STEPS.length - 1 ? "idle" : i >= 4 ? "ok" : i === 2 ? "brass" : "navy" }))} />
            </Card>
          )}
          {p("letters.outgoing.view") && (
            <Card title="Alur surat keluar" action={<Link href="/surat-keluar" className="text-xs font-medium text-navy-700 hover:underline">Lihat semua</Link>}>
              <BarList rows={tally(out, OUTGOING_STEPS).map((r, i) => ({ ...r, tone: i === OUTGOING_STEPS.length - 1 ? "idle" : i >= 4 ? "ok" : i === 1 || i === 2 ? "brass" : "navy" }))} />
            </Card>
          )}
          {p("audit_logs.view") && (
            <Card title="Aktivitas terbaru" action={<Link href="/audit-log" className="text-xs font-medium text-navy-700 hover:underline">Lihat semua</Link>}>
              {actRows.length ? (
                <ol className="space-y-3.5">
                  {actRows.map((a) => (
                    <li key={a.id} className="flex gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brass" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-sm text-ink">{auditLabel(a.action)}</p>
                        <p className="text-xs text-ink-mute">{names[a.actor_id] ?? "Sistem"} - {formatDateTime(a.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-sm text-ink-mute">Belum ada aktivitas.</p>}
            </Card>
          )}
          {!p("letters.incoming.view") && !p("letters.outgoing.view") && !p("audit_logs.view") && (
            <Card title="Pintasan">
              <ul className="space-y-2.5 text-sm">
                <li><Link className="font-medium text-navy-700 hover:underline" href="/disposisi">Disposisi saya</Link></li>
                <li><Link className="font-medium text-navy-700 hover:underline" href="/agenda">Agenda dan tenggat</Link></li>
                <li><Link className="font-medium text-navy-700 hover:underline" href="/notifikasi">Notifikasi</Link></li>
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}