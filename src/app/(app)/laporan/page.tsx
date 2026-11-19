import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, Field, inputClass, LinkButton, PageHeader, SubmitButton } from "@/components/ui";
import { StatusChips } from "@/components/letters";
import { BarList, KpiCard, VolumeChart } from "@/components/dashboard";
import { firstParam, formatDate, todayJakarta } from "@/lib/utils";
import { INCOMING_STEPS, OUTGOING_STEPS, STATUS_LABEL } from "@/lib/constants";
import { AlarmClock, Download, MailOpen, Send, Split } from "lucide-react";

export const metadata = { title: "Laporan" };
type Row = Record<string, any>;

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const PRESETS = [
  { value: "bulan", label: "Bulan ini" }, { value: "triwulan", label: "3 bulan terakhir" },
  { value: "tahun", label: "Tahun ini" }, { value: "lalu", label: "Tahun lalu" },
];
const pad = (n: number) => String(n).padStart(2, "0");
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

function presetRange(preset: string, today: string): { from: string; to: string } {
  const [y, m] = today.split("-").map(Number);
  if (preset === "bulan") return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${lastDay(y, m)}` };
  if (preset === "triwulan") { const d = new Date(Date.UTC(y, m - 3, 1)); return { from: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01`, to: `${y}-${pad(m)}-${lastDay(y, m)}` }; }
  if (preset === "lalu") return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}
function monthsBetween(from: string, to: string): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) { out.push({ key: `${y}-${pad(m)}`, label: MONTH_SHORT[m - 1] }); m++; if (m > 12) { m = 1; y++; } }
  return out.slice(-12);
}
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const top = (rows: Row[], key: string, n = 5) => {
  const map = new Map<string, number>();
  rows.forEach((r) => { const k = String(r[key] ?? "").trim(); if (k) map.set(k, (map.get(k) ?? 0) + 1); });
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, value]) => ({ label: label.length > 38 ? label.slice(0, 37) + "..." : label, value }));
};

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await requirePermission("reports.view");
  const sb = createClient();
  const today = todayJakarta();
  const re = /^\d{4}-\d{2}-\d{2}$/;
  const qf = firstParam(searchParams.from), qt = firstParam(searchParams.to);
  const custom = re.test(qf) && re.test(qt) && qf <= qt;
  const preset = PRESETS.some((p) => p.value === firstParam(searchParams.periode)) ? firstParam(searchParams.periode) : "tahun";
  const { from, to } = custom ? { from: qf, to: qt } : presetRange(preset, today);

  const [incQ, outQ, dispQ] = await Promise.all([
    sb.from("incoming_letters").select("status, received_date, sender").gte("received_date", from).lte("received_date", to).limit(10000),
    sb.from("outgoing_letters").select("status, letter_date, recipient").gte("letter_date", from).lte("letter_date", to).limit(10000),
    sb.from("letter_dispositions").select("status, due_date").gte("created_at", `${from}T00:00:00+07:00`).lte("created_at", `${to}T23:59:59+07:00`).limit(10000),
  ]);
  const inc = (incQ.data ?? []) as Row[], out = (outQ.data ?? []) as Row[], disp = (dispQ.data ?? []) as Row[];

  const months = monthsBetween(from, to);
  const bucket = (rows: Row[], key: string) => months.map((m) => rows.filter((r) => String(r[key]).slice(0, 7) === m.key).length);
  const tally = (rows: Row[], steps: string[]) => steps.map((st) => ({ label: STATUS_LABEL[st] ?? st, value: rows.filter((r) => r.status === st).length }));

  const incDone = inc.filter((r) => ["SELESAI", "DIARSIPKAN"].includes(r.status as string)).length;
  const outDone = out.filter((r) => ["FINAL", "DIKIRIM", "DIARSIPKAN"].includes(r.status as string)).length;
  const dispDone = disp.filter((r) => r.status === "SELESAI").length;
  const dispLate = disp.filter((r) => r.status !== "SELESAI" && r.due_date && (r.due_date as string) < today).length;
  const qs = `from=${from}&to=${to}`;
  const empty = !inc.length && !out.length && !disp.length;

  return (
    <div className="space-y-6">
      <PageHeader title="Laporan" description="Rekap kegiatan persuratan per periode. Data mengikuti hak akses Anda." />

      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-line bg-surface-card p-4 shadow-card">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-mute">Periode</p>
          <StatusChips basePath="/laporan" param="periode" params={{}} active={custom ? "kustom" : preset} items={PRESETS} />
        </div>
        <form className="flex flex-wrap items-end gap-3" aria-label="Periode kustom">
          <Field label="Dari" htmlFor="from"><input id="from" name="from" type="date" defaultValue={from} className={inputClass + " w-auto"} /></Field>
          <Field label="Sampai" htmlFor="to"><input id="to" name="to" type="date" defaultValue={to} className={inputClass + " w-auto"} /></Field>
          <SubmitButton variant="secondary">Terapkan</SubmitButton>
        </form>
      </div>
      <p className="-mt-3 text-sm text-ink-soft">Menampilkan <strong className="font-medium text-ink">{formatDate(from)}</strong> sampai <strong className="font-medium text-ink">{formatDate(to)}</strong>.</p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Surat masuk" value={inc.length} hint={`${pct(incDone, inc.length)}% selesai atau diarsipkan`} icon={MailOpen} />
        <KpiCard label="Surat keluar" value={out.length} hint={`${pct(outDone, out.length)}% final atau terkirim`} icon={Send} />
        <KpiCard label="Disposisi" value={disp.length} hint={`${pct(dispDone, disp.length)}% selesai`} icon={Split} />
        <KpiCard label="Disposisi terlambat" value={dispLate} hint={dispLate ? "Melewati tenggat, belum selesai" : "Tidak ada"} icon={AlarmClock} tone={dispLate ? "bad" : "default"} />
      </div>

      {empty ? (
        <Card><p className="py-8 text-center text-sm text-ink-mute">Tidak ada data pada periode ini. Pilih periode lain di atas.</p></Card>
      ) : (
        <>
          <Card title="Volume surat per bulan"><VolumeChart labels={months.map((m) => m.label)} incoming={bucket(inc, "received_date")} outgoing={bucket(out, "letter_date")} /></Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Surat masuk menurut status"><BarList rows={tally(inc, INCOMING_STEPS).map((r, i) => ({ ...r, tone: i === INCOMING_STEPS.length - 1 ? "idle" as const : i >= 4 ? "ok" as const : i === 2 ? "brass" as const : "navy" as const }))} /></Card>
            <Card title="Surat keluar menurut status"><BarList rows={tally(out, OUTGOING_STEPS).map((r, i) => ({ ...r, tone: i === OUTGOING_STEPS.length - 1 ? "idle" as const : i >= 4 ? "ok" as const : i === 1 || i === 2 ? "brass" as const : "navy" as const }))} /></Card>
            <Card title="Pengirim surat terbanyak">{top(inc, "sender").length ? <BarList rows={top(inc, "sender").map((r) => ({ ...r, tone: "navy" as const }))} /> : <p className="text-sm text-ink-mute">Belum ada data.</p>}</Card>
            <Card title="Tujuan surat keluar terbanyak">{top(out, "recipient").length ? <BarList rows={top(out, "recipient").map((r) => ({ ...r, tone: "brass" as const }))} /> : <p className="text-sm text-ink-mute">Belum ada data.</p>}</Card>
          </div>
        </>
      )}

      <Card title="Ekspor data">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-xl text-sm text-ink-soft">Unduh data periode di atas dalam format CSV untuk dibuka di Excel atau Google Sheets. Maksimal 5.000 baris per berkas; surat rahasia hanya disertakan bila Anda berhak melihatnya.</p>
          <div className="flex flex-wrap gap-2.5">
            <LinkButton href={`/api/reports/export?jenis=masuk&${qs}`} variant="secondary"><Download className="h-4 w-4" aria-hidden />Surat masuk (CSV)</LinkButton>
            <LinkButton href={`/api/reports/export?jenis=keluar&${qs}`} variant="secondary"><Download className="h-4 w-4" aria-hidden />Surat keluar (CSV)</LinkButton>
          </div>
        </div>
      </Card>
    </div>
  );
}