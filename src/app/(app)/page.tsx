import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getProfileMap } from "@/lib/data";
import { Flash } from "@/components/ui";
import { Contents, Diary, FolderPanel, HatchChart, InkButton, Masthead, Postmark, SlipList, TallyStrip, type DiaryEntry, type Slip, type Tally } from "@/components/register";
import { auditLabel, INCOMING_STEPS, OUTGOING_STEPS, STATUS_LABEL } from "@/lib/constants";
import { firstParam, formatDate, todayJakarta } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
type Row = Record<string, any>;
const none = { data: [] as Row[] };
const jkt = (iso: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", ...opts }).format(new Date(iso));

export default async function Dashboard({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const s = await requireSession();
  const sb = createClient();
  const p = (x: Parameters<typeof can>[1]) => can(s.permissions, x);
  const today = todayJakarta();
  const [ty, tm] = today.split("-").map(Number);

  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(ty, tm - 1 - i, 1));
    months.push({ key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`, label: MONTH_SHORT[d.getUTCMonth()] });
  }

  const nowIso = new Date().toISOString();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date())) % 24;
  const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";

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
      ? sb.from("audit_logs").select("id, actor_id, action, created_at").not("action", "in", "(AUTH_LOGIN,AUTH_LOGIN_GOOGLE,AUTH_LOGOUT,FILE_DOWNLOAD)").order("created_at", { ascending: false }).limit(6)
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
  const names = await getProfileMap(sb, actRows.map((a) => a.actor_id as string));

  const bucket = (rows: Row[], key: string) => months.map((m) => rows.filter((r) => String(r[key]).slice(0, 7) === m.key).length);
  const incByMonth = bucket(inc, "received_date");
  const outByMonth = bucket(out, "letter_date");
  const tally = (rows: Row[], steps: string[]) => steps.map((st) => ({ label: STATUS_LABEL[st] ?? st, value: rows.filter((r) => r.status === st).length }));
  const overdue = dispRows.filter((d) => d.due_date && d.due_date < today).length;

  // ----- lembar tugas -----
  const subj = (conf: boolean, text: string) => (conf ? "Surat rahasia" : text);
  const daysUntil = (d: string) => Math.round((new Date(d + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86400000);
  type Ranked = Slip & { rank: number; sort: string };
  const slips: Ranked[] = [];
  dispRows.forEach((d) => {
    const left = d.due_date ? daysUntil(d.due_date as string) : null;
    const late = left !== null && left < 0;
    slips.push({
      id: "d" + d.id, href: `/disposisi/${d.id}`, title: subj(!!d.incoming?.is_confidential, d.incoming?.subject ?? "Surat"), meta: `Disposisi: ${d.instruction}`,
      status: d.status as string, overdue: late, soon: left !== null && left >= 0 && left <= 2,
      dueLabel: d.due_date ? (late ? `lewat ${Math.abs(left!)} hari` : left === 0 ? "tenggat hari ini" : `tenggat ${formatDate(d.due_date as string)}`) : undefined,
      rank: late ? 0 : left !== null && left <= 2 ? 1 : 3, sort: (d.due_date as string) ?? "9999",
    });
  });
  apprRows.forEach((l) => slips.push({ id: "a" + l.id, href: `/surat-keluar/${l.id}`, title: subj(l.is_confidential, l.subject), meta: `Menunggu persetujuan, kepada ${l.recipient}`, status: l.status, rank: 2, sort: l.letter_date }));
  finalRows.forEach((l) => slips.push({ id: "f" + l.id, href: `/surat-keluar/${l.id}`, title: subj(l.is_confidential, l.subject), meta: `Siap diberi nomor, kepada ${l.recipient}`, status: "DISETUJUI", rank: 2, sort: l.letter_date }));
  reviseRows.forEach((l) => slips.push({ id: "r" + l.id, href: `/surat-keluar/${l.id}`, title: subj(l.is_confidential, l.subject), meta: `Perlu direvisi, kepada ${l.recipient}`, status: "PERLU_REVISI", rank: 1, sort: l.letter_date }));
  verifyRows.forEach((l) => slips.push({ id: "v" + l.id, href: `/surat-masuk/${l.id}`, title: subj(l.is_confidential, l.subject), meta: `Perlu diproses, dari ${l.sender}`, status: l.status, rank: 3, sort: l.received_date }));
  slips.sort((a, b) => a.rank - b.rank || a.sort.localeCompare(b.sort));
  const topSlips = slips.slice(0, 7);

  // ----- rekap angka (maks. 4, sesuai peran) -----
  const tallies: Tally[] = [];
  if (p("letters.outgoing.approve")) tallies.push({ key: "appr", label: "Menunggu persetujuan", value: apprRows.length, note: apprRows.length ? "surat keluar menanti keputusan Anda" : "tidak ada antrean", tone: apprRows.length ? "warn" : undefined, href: "/surat-keluar?status=DIAJUKAN" });
  if (p("letters.incoming.update")) tallies.push({ key: "ver", label: "Surat masuk diproses", value: verifyRows.length, note: "dicatat atau diverifikasi", tone: verifyRows.length ? "warn" : undefined, href: "/surat-masuk" });
  if (p("letters.outgoing.update")) tallies.push({ key: "fin", label: "Siap diberi nomor", value: finalRows.length, note: "disetujui, belum final", href: "/surat-keluar?status=DISETUJUI" });
  tallies.push({ key: "disp", label: canRespond ? "Disposisi untuk saya" : "Disposisi berjalan", value: dispRows.length, note: overdue ? `${overdue} melewati tenggat` : "belum selesai", tone: overdue ? "bad" : undefined, href: "/disposisi" });
  if (p("letters.incoming.view")) tallies.push({ key: "in", label: "Masuk bulan ini", value: incByMonth[5], note: `${inc.length} surat tercatat`, href: "/surat-masuk" });
  if (p("letters.outgoing.view")) tallies.push({ key: "out", label: "Keluar bulan ini", value: outByMonth[5], note: `${out.length} surat tercatat`, href: "/surat-keluar" });
  if (p("archives.view")) tallies.push({ key: "arc", label: "Diarsipkan", value: inc.filter((r) => r.status === "DIARSIPKAN").length + out.filter((r) => r.status === "DIARSIPKAN").length, note: "surat masuk dan keluar", href: "/arsip" });
  const shown = tallies.slice(0, 4);

  // ----- kop -----
  const parts: string[] = [];
  if (apprRows.length) parts.push(`${apprRows.length} surat menunggu persetujuan Anda`);
  if (verifyRows.length) parts.push(`${verifyRows.length} surat masuk perlu diproses`);
  if (finalRows.length) parts.push(`${finalRows.length} surat siap diberi nomor`);
  if (dispRows.length) parts.push(`${dispRows.length} disposisi ${canRespond ? "menunggu tindak lanjut Anda" : "sedang berjalan"}`);
  const summary = parts.length ? `Catatan hari ini: ${parts.slice(0, 3).join(", ")}.` : "Catatan hari ini: tidak ada pekerjaan yang menunggu. Semua sudah beres.";
  const actions: React.ReactNode[] = [];
  if (p("letters.incoming.create")) actions.push(<InkButton key="a" href="/surat-masuk/baru" primary>Catat surat masuk</InkButton>);
  if (p("letters.outgoing.create")) actions.push(<InkButton key="b" href="/surat-keluar/baru" primary={!p("letters.incoming.create")}>Buat surat keluar</InkButton>);
  if (p("letters.outgoing.approve") && apprRows.length) actions.push(<InkButton key="c" href="/surat-keluar?status=DIAJUKAN" primary>{`Tinjau ${apprRows.length} surat`}</InkButton>);
  if (canRespond) actions.push(<InkButton key="d" href="/disposisi" primary>Buka disposisi saya</InkButton>);

  const diary: DiaryEntry[] = actRows.map((a) => ({
    id: String(a.id), time: jkt(a.created_at as string, { hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":"),
    date: jkt(a.created_at as string, { day: "numeric", month: "short" }), text: auditLabel(a.action as string), by: names[a.actor_id as string] ?? "Sistem",
  }));

  return (
    <div className="space-y-9">
      <Masthead greeting={greeting} name={s.fullName.split(" ")[0]} summary={summary} actions={actions.slice(0, 3)}
        postmark={<Postmark weekday={jkt(nowIso, { weekday: "long" })} day={String(Number(today.slice(8, 10)))} month={MONTH_SHORT[tm - 1]} year={String(ty)} />} />
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />

      <TallyStrip items={shown} />

      <div className="grid gap-x-8 gap-y-9 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="space-y-9">
          <FolderPanel title="Perlu tindakan Anda" delay={140} action={slips.length > 7 ? <span className="font-display italic text-ink-mute">{slips.length} item, 7 teratas</span> : undefined}>
            <SlipList items={topSlips} emptyTitle="Tidak ada yang menunggu" emptyText="Disposisi, persetujuan, atau surat masuk baru akan tercatat di sini." />
          </FolderPanel>
          {(p("letters.incoming.view") || p("letters.outgoing.view")) && (
            <FolderPanel title="Surat enam bulan terakhir" delay={220}>
              <HatchChart labels={months.map((m) => m.label)} incoming={incByMonth} outgoing={outByMonth} />
            </FolderPanel>
          )}
        </div>

        <div className="space-y-9">
          {p("letters.incoming.view") && (
            <FolderPanel title="Daftar isi: surat masuk" delay={200} action={<Link href="/surat-masuk" className="font-semibold text-navy-700 hover:underline">Buka</Link>}>
              <Contents rows={tally(inc, INCOMING_STEPS)} />
            </FolderPanel>
          )}
          {p("letters.outgoing.view") && (
            <FolderPanel title="Daftar isi: surat keluar" delay={260} action={<Link href="/surat-keluar" className="font-semibold text-navy-700 hover:underline">Buka</Link>}>
              <Contents rows={tally(out, OUTGOING_STEPS)} />
            </FolderPanel>
          )}
          {p("audit_logs.view") && (
            <FolderPanel title="Buku harian" delay={320} action={<Link href="/audit-log" className="font-semibold text-navy-700 hover:underline">Lihat semua</Link>}>
              <Diary entries={diary} />
            </FolderPanel>
          )}
          {!p("letters.incoming.view") && !p("letters.outgoing.view") && !p("audit_logs.view") && (
            <FolderPanel title="Pintasan" delay={200}>
              <ul className="space-y-3 font-display text-[16px]">
                <li><Link className="text-navy-800 underline decoration-brass decoration-2 underline-offset-4" href="/disposisi">Disposisi saya</Link></li>
                <li><Link className="text-navy-800 underline decoration-brass decoration-2 underline-offset-4" href="/agenda">Agenda dan tenggat</Link></li>
                <li><Link className="text-navy-800 underline decoration-brass decoration-2 underline-offset-4" href="/notifikasi">Notifikasi</Link></li>
              </ul>
            </FolderPanel>
          )}
        </div>
      </div>
    </div>
  );
}