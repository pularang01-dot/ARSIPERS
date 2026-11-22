import Link from "next/link";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, STATUS_TONE, type Tone } from "@/lib/constants";

/* Gaya "buku agenda tata usaha": kop surat, cap pos, stempel, tab map arsip, daftar isi, buku harian. */

const INK: Record<Tone, string> = { ok: "text-ok", warn: "text-brass-dark", bad: "text-bad", info: "text-navy-700", idle: "text-ink-soft" };

/* ---------- Stempel status ---------- */
export function Stamp({ children, tone = "info", className }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-block -rotate-2 rounded-[3px] border-2 px-1.5 py-px font-sans text-[10.5px] font-bold uppercase leading-tight tracking-[0.12em] mix-blend-multiply", INK[tone], className)}
      style={{ boxShadow: "inset 0 0 0 2px #fff, inset 0 0 0 3px currentColor" }}>{children}</span>
  );
}
export const StatusStamp = ({ value }: { value: string }) => <Stamp tone={STATUS_TONE[value] ?? "idle"}>{STATUS_LABEL[value] ?? value}</Stamp>;

/* ---------- Cap tanggal pos ---------- */
export function Postmark({ weekday, day, month, year }: { weekday: string; day: string; month: string; year: string }) {
  return (
    <div className="stamp-in text-navy-800 mix-blend-multiply" aria-hidden>
      <svg width="136" height="136" viewBox="0 0 136 136" fill="none">
        <defs><path id="pm-arc" d="M 68,68 m -53,0 a 53,53 0 1,1 106,0 a 53,53 0 1,1 -106,0" /></defs>
        <circle cx="68" cy="68" r="64" stroke="currentColor" strokeWidth="2.4" />
        <circle cx="68" cy="68" r="43" stroke="currentColor" strokeWidth="1.2" />
        <text fontSize="9.5" fontWeight="700" letterSpacing="2" fill="currentColor" fontFamily="Segoe UI, Arial, sans-serif">
          <textPath href="#pm-arc" startOffset="0" textLength="326" lengthAdjust="spacing">ARSIPERS • SDN PANDIAN I SUMENEP •</textPath>
        </text>
        <text x="68" y="55" textAnchor="middle" fontSize="10" fontWeight="700" letterSpacing="2.5" fill="currentColor" fontFamily="Segoe UI, Arial, sans-serif">{weekday.toUpperCase()}</text>
        <text x="68" y="84" textAnchor="middle" fontSize="34" fontWeight="700" fill="currentColor" fontFamily="Cambria, Georgia, serif">{day}</text>
        <text x="68" y="98" textAnchor="middle" fontSize="10" fontWeight="700" letterSpacing="2" fill="currentColor" fontFamily="Segoe UI, Arial, sans-serif">{month.toUpperCase()} {year}</text>
      </svg>
    </div>
  );
}

/* ---------- Kop halaman (garis tebal-tipis ala kop surat) ---------- */
export function Masthead({ greeting, name, summary, actions, postmark }: {
  greeting: string; name: string; summary: string; actions?: React.ReactNode; postmark: React.ReactNode;
}) {
  return (
    <header className="rise">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
        <div className="min-w-0 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brass-dark">Buku agenda &middot; SDN Pandian I Sumenep</p>
          <h1 className="mt-2 font-display text-[clamp(30px,4.2vw,44px)] font-semibold leading-[1.08] tracking-tight text-navy-900">
            {greeting}, <em className="font-medium italic text-navy-700">{name}.</em>
          </h1>
          <p className="mt-4 border-l-[3px] border-brass pl-4 font-display text-[17px] italic leading-relaxed text-ink-soft">{summary}</p>
          {actions && <div className="mt-5 flex flex-wrap gap-2.5">{actions}</div>}
        </div>
        <div className="hidden pr-2 sm:block">{postmark}</div>
      </div>
      <div className="mt-7" aria-hidden><div className="h-[3px] bg-navy-900" /><div className="mt-[3px] h-px bg-navy-900" /></div>
    </header>
  );
}

export function InkButton({ href, children, primary }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex min-h-[42px] items-center rounded-md px-4 text-sm font-semibold tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600",
      primary ? "bg-navy-900 text-white hover:bg-navy-700" : "border border-navy-900/40 text-navy-900 hover:bg-white")}>{children}</Link>
  );
}

/* ---------- Rekap angka (bukan kartu berikon) ---------- */
export type Tally = { key: string; label: string; value: number; note?: string; tone?: "warn" | "bad"; href?: string };
export function TallyStrip({ items }: { items: Tally[] }) {
  return (
    <section aria-label="Rekap angka" className="rise border-b border-navy-900/25" style={{ animationDelay: "90ms" }}>
      <ul className={cn("grid divide-line-strong sm:grid-cols-2 sm:divide-x", items.length >= 4 ? "xl:grid-cols-4" : items.length === 3 ? "xl:grid-cols-3" : "")}>
        {items.map((t, i) => {
          const color = t.tone === "bad" ? "text-bad" : t.tone === "warn" ? "text-brass-dark" : "text-navy-900";
          const inner = (
            <div className={cn("h-full px-1 py-6 sm:px-7", i === 0 && "sm:pl-1")}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">{t.label}</p>
              <p className={cn("mt-2 font-display text-[56px] font-semibold leading-none tabular-nums", color)}>{t.value}</p>
              {t.note && <p className="mt-2.5 font-display text-[14px] italic text-ink-mute">{t.note}</p>}
            </div>
          );
          return <li key={t.key}>{t.href ? <Link href={t.href} className="block transition-colors hover:bg-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600">{inner}</Link> : inner}</li>;
        })}
      </ul>
    </section>
  );
}

/* ---------- Panel bertab seperti map arsip ---------- */
export function FolderPanel({ title, action, children, delay = 0 }: { title: string; action?: React.ReactNode; children: React.ReactNode; delay?: number }) {
  return (
    <section className="rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-end justify-between gap-3">
        <h2 className="relative z-10 -mb-px rounded-t-lg border border-b-0 border-line-strong bg-white px-4 pb-2 pt-2.5 font-display text-[16px] font-semibold text-navy-900">{title}</h2>
        {action && <div className="pb-1.5 text-xs">{action}</div>}
      </div>
      <div className="rounded-xl rounded-tl-none border border-line-strong bg-white p-5 shadow-card">{children}</div>
    </section>
  );
}

/* ---------- Lembar tugas (daftar bernomor) ---------- */
export type Slip = { id: string; href: string; title: string; meta: string; status: string; overdue?: boolean; soon?: boolean; dueLabel?: string };
export function SlipList({ items, emptyTitle, emptyText }: { items: Slip[]; emptyTitle: string; emptyText: string }) {
  if (!items.length) {
    return (
      <div className="px-4 py-10 text-center">
        <Stamp tone="ok" className="text-sm">Beres</Stamp>
        <p className="mt-4 font-display text-lg font-semibold text-navy-900">{emptyTitle}</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-ink-soft">{emptyText}</p>
      </div>
    );
  }
  return (
    <ol className="-my-2">
      {items.map((it, i) => (
        <li key={it.id} className="rise border-b border-dotted border-line-strong last:border-0" style={{ animationDelay: `${150 + i * 55}ms` }}>
          <Link href={it.href} className="group relative flex gap-4 rounded-md py-3.5 pl-9 pr-2 transition-colors hover:bg-[#F3F7FC] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600">
            <span className="absolute left-1 top-3 w-6 text-right font-display text-xl italic text-ink-mute tabular-nums" aria-hidden>{i + 1}.</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[17px] font-semibold leading-snug text-navy-900 decoration-brass decoration-2 underline-offset-4 group-hover:underline">{it.title}</p>
              <p className="mt-0.5 truncate text-[13px] text-ink-soft">{it.meta}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
              {it.overdue ? <Stamp tone="bad">Terlambat</Stamp> : <StatusStamp value={it.status} />}
              {it.dueLabel && <span className={cn("font-display text-[13px] italic tabular-nums", it.overdue ? "font-semibold text-bad" : it.soon ? "text-brass-dark" : "text-ink-mute")}>{it.dueLabel}</span>}
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Daftar isi bertitik ---------- */
export function Contents({ rows }: { rows: { label: string; value: number }[] }) {
  return (
    <dl className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline gap-2">
          <dt className={cn("font-display text-[15.5px]", r.value ? "text-ink" : "text-ink-mute")}>{r.label}</dt>
          <span className="min-w-[1.5rem] flex-1 translate-y-[-3px] border-b-2 border-dotted border-line-strong" aria-hidden />
          <dd className={cn("font-display text-[17px] tabular-nums", r.value ? "font-semibold text-navy-900" : "text-ink-mute")}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- Grafik gaya cetak (arsir) ---------- */
export function HatchChart({ labels, incoming, outgoing }: { labels: string[]; incoming: number[]; outgoing: number[] }) {
  const W = 560, H = 236, L = 32, R = 8, T = 22, B = 34;
  const iw = W - L - R, ih = H - T - B;
  const max = Math.max(4, ...incoming, ...outgoing);
  const step = iw / labels.length, bw = Math.min(24, step / 3);
  const y = (v: number) => T + ih - (v / max) * ih;
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const total = incoming.reduce((a, b) => a + b, 0) + outgoing.reduce((a, b) => a + b, 0);
  const swatch = (hatch: boolean) => (
    <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden><rect x="0.6" y="0.6" width="16.8" height="10.8" fill={hatch ? "url(#hatch-out)" : "#1B3358"} stroke={hatch ? "#7A5C1E" : "#1B3358"} strokeWidth="1.2" /></svg>
  );
  return (
    <div>
      <div className="mb-3 flex items-center gap-6 font-display text-[14px] italic text-ink-soft">
        <span className="inline-flex items-center gap-2">{swatch(false)}Surat masuk</span>
        <span className="inline-flex items-center gap-2">{swatch(true)}Surat keluar</span>
      </div>
      {total === 0 ? <p className="py-10 text-center font-display text-[15px] italic text-ink-mute">Belum ada surat tercatat pada enam bulan terakhir.</p> : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Grafik batang jumlah surat masuk dan surat keluar per bulan selama enam bulan terakhir">
            <defs>
              <pattern id="hatch-out" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#fff" /><line x1="0" y1="0" x2="0" y2="5" stroke="#7A5C1E" strokeWidth="2.2" /></pattern>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#C2CCDA" strokeDasharray={t === 0 ? undefined : "1 4"} strokeLinecap="round" strokeWidth={t === 0 ? 1.5 : 1.2} />
                <text x={L - 7} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6B7587" fontFamily="Cambria, Georgia, serif" fontStyle="italic">{t}</text>
              </g>
            ))}
            <line x1={L} x2={W - R} y1={y(0) + 3} y2={y(0) + 3} stroke="#C2CCDA" strokeWidth="1" />
            {labels.map((lb, i) => {
              const cx = L + step * i + step / 2;
              return (
                <g key={lb}>
                  <rect x={cx - bw - 2} y={y(incoming[i])} width={bw} height={Math.max(0, T + ih - y(incoming[i]))} fill="#1B3358" />
                  <rect x={cx + 2} y={y(outgoing[i])} width={bw} height={Math.max(0, T + ih - y(outgoing[i]))} fill="url(#hatch-out)" stroke="#7A5C1E" strokeWidth="1.2" />
                  {incoming[i] > 0 && <text x={cx - bw / 2 - 2} y={y(incoming[i]) - 6} textAnchor="middle" fontSize="13" fontWeight="700" fill="#1B3358" fontFamily="Cambria, Georgia, serif">{incoming[i]}</text>}
                  {outgoing[i] > 0 && <text x={cx + bw / 2 + 2} y={y(outgoing[i]) - 6} textAnchor="middle" fontSize="13" fontWeight="700" fill="#7A5C1E" fontFamily="Cambria, Georgia, serif">{outgoing[i]}</text>}
                  <text x={cx} y={H - 11} textAnchor="middle" fontSize="10.5" fontWeight="600" letterSpacing="1.6" fill="#475266">{lb.toUpperCase()}</text>
                </g>
              );
            })}
          </svg>
          <table className="sr-only">
            <caption>Jumlah surat per bulan</caption>
            <thead><tr><th scope="col">Bulan</th><th scope="col">Surat masuk</th><th scope="col">Surat keluar</th></tr></thead>
            <tbody>{labels.map((lb, i) => <tr key={lb}><th scope="row">{lb}</th><td>{incoming[i]}</td><td>{outgoing[i]}</td></tr>)}</tbody>
          </table>
        </>
      )}
    </div>
  );
}

/* ---------- Buku harian (garis margin merah) ---------- */
export type DiaryEntry = { id: string; time: string; date: string; text: string; by: string };
export function Diary({ entries }: { entries: DiaryEntry[] }) {
  if (!entries.length) return <p className="py-4 text-center font-display text-[15px] italic text-ink-mute">Belum ada catatan.</p>;
  return (
    <ol>
      {entries.map((e) => (
        <li key={e.id} className="flex border-b border-dotted border-line-strong last:border-0">
          <div className="w-[64px] shrink-0 py-3 pr-3 text-right">
            <p className="font-display text-[15px] font-semibold leading-none tabular-nums text-navy-900">{e.time}</p>
            <p className="mt-1 text-[11px] text-ink-mute">{e.date}</p>
          </div>
          <span className="w-[4px] shrink-0 border-x border-bad/35" aria-hidden />
          <div className="min-w-0 flex-1 py-3 pl-4">
            <p className="font-display text-[15px] leading-snug text-ink">{e.text}</p>
            <p className="mt-0.5 text-xs text-ink-mute">{e.by}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}