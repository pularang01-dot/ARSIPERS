import Link from "next/link";
import { ArrowUpRight, ChevronRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui";

type Icon = React.ComponentType<{ className?: string }>;

/* ---------- Hero ---------- */
export type HeroAction = { href: string; label: string; primary?: boolean };
export function Hero({ greeting, name, dateLabel, summary, actions }: { greeting: string; name: string; dateLabel: string; summary: string; actions: HeroAction[] }) {
  return (
    <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 px-6 py-7 text-white shadow-lift sm:px-8">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden
        style={{ backgroundImage: "repeating-linear-gradient(135deg, #fff 0, #fff 1px, transparent 1px, transparent 14px)" }} />
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brass via-brass-soft to-brass" aria-hidden />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 max-w-xl">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-brass-soft">{dateLabel}</p>
          <h1 className="mt-2 font-display text-[30px] font-semibold leading-tight tracking-tight">{greeting}, {name}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-navy-100/85">{summary}</p>
        </div>
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2.5">
            {actions.map((a) => (
              <Link key={a.href + a.label} href={a.href}
                className={cn("inline-flex min-h-[42px] items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                  a.primary ? "bg-white text-navy-900 hover:bg-brass-soft" : "border border-white/25 text-white hover:bg-white/10")}>
                {a.label}{a.primary && <ArrowUpRight className="h-4 w-4" aria-hidden />}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- KPI ---------- */
export function KpiCard({ label, value, hint, icon: Icon, tone = "default", href }: { label: string; value: number | string; hint?: string; icon: Icon; tone?: "default" | "warn" | "bad"; href?: string }) {
  const chip = tone === "bad" ? "bg-bad-bg text-bad" : tone === "warn" ? "bg-brass-soft text-brass-dark" : "bg-navy-50 text-navy-700";
  const inner = (
    <div className="group flex h-full items-start gap-4 rounded-xl border border-line bg-surface-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", chip)} aria-hidden><Icon className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-ink-soft">{label}</p>
        <p className="mt-0.5 font-display text-[32px] font-semibold leading-none tabular-nums text-navy-900">{value}</p>
        {hint && <p className={cn("mt-2 text-xs", tone === "bad" ? "font-medium text-bad" : "text-ink-mute")}>{hint}</p>}
      </div>
      {href && <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-line-strong transition-colors group-hover:text-navy-600" aria-hidden />}
    </div>
  );
  return href ? <Link href={href} className="block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600">{inner}</Link> : inner;
}

/* ---------- Daftar tindakan ---------- */
export type ActionItem = { id: string; href: string; icon: Icon; title: string; meta: string; badge?: string; dueLabel?: string; overdue?: boolean; soon?: boolean };
export function ActionList({ items, emptyTitle, emptyText }: { items: ActionItem[]; emptyTitle: string; emptyText: string }) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center px-4 py-10 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ok-bg text-ok" aria-hidden><CheckCircle2 className="h-5 w-5" /></span>
        <p className="mt-3 text-sm font-medium text-ink">{emptyTitle}</p>
        <p className="mt-1 max-w-xs text-sm text-ink-soft">{emptyText}</p>
      </div>
    );
  }
  return (
    <ul className="-my-1 divide-y divide-line">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <li key={it.id}>
            <Link href={it.href} className="group flex items-center gap-3.5 rounded-lg px-2 py-3 transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600">
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", it.overdue ? "bg-bad-bg text-bad" : "bg-navy-50 text-navy-700")} aria-hidden><Icon className="h-[18px] w-[18px]" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink group-hover:text-navy-800">{it.title}</p>
                <p className="mt-0.5 truncate text-xs text-ink-mute">{it.meta}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {it.badge && <StatusBadge value={it.badge} />}
                {it.dueLabel && <span className={cn("text-xs tabular-nums", it.overdue ? "font-semibold text-bad" : it.soon ? "font-medium text-brass-dark" : "text-ink-mute")}>{it.dueLabel}</span>}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Bar horizontal ---------- */
export function BarList({ rows }: { rows: { label: string; value: number; tone?: "navy" | "brass" | "ok" | "idle" }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const fill = { navy: "bg-navy-700", brass: "bg-brass", ok: "bg-ok", idle: "bg-line-strong" };
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between text-[13px]">
            <span className={r.value ? "text-ink" : "text-ink-mute"}>{r.label}</span>
            <span className="font-medium tabular-nums text-ink">{r.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface" role="presentation">
            <div className={cn("h-full rounded-full", fill[r.tone ?? "navy"])} style={{ width: `${r.value ? Math.max(4, (r.value / max) * 100) : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Grafik batang 6 bulan (SVG) ---------- */
export function VolumeChart({ labels, incoming, outgoing }: { labels: string[]; incoming: number[]; outgoing: number[] }) {
  const W = 560, H = 230, L = 30, R = 8, T = 18, B = 30;
  const iw = W - L - R, ih = H - T - B;
  const max = Math.max(4, ...incoming, ...outgoing);
  const step = iw / labels.length, bw = Math.min(22, step / 3);
  const y = (v: number) => T + ih - (v / max) * ih;
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const total = incoming.reduce((a, b) => a + b, 0) + outgoing.reduce((a, b) => a + b, 0);
  return (
    <div>
      <div className="mb-3 flex items-center gap-5 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-navy-700" aria-hidden />Surat masuk</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brass" aria-hidden />Surat keluar</span>
      </div>
      {total === 0 ? <p className="py-10 text-center text-sm text-ink-mute">Belum ada data surat pada enam bulan terakhir.</p> : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Grafik batang jumlah surat masuk dan surat keluar per bulan selama enam bulan terakhir">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#DCE3EC" strokeDasharray={t === 0 ? undefined : "3 4"} />
                <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="10.5" fill="#6B7587">{t}</text>
              </g>
            ))}
            {labels.map((lb, i) => {
              const cx = L + step * i + step / 2;
              return (
                <g key={lb}>
                  <rect x={cx - bw - 2} y={y(incoming[i])} width={bw} height={Math.max(0, T + ih - y(incoming[i]))} rx="3" fill="#1B3358" />
                  <rect x={cx + 2} y={y(outgoing[i])} width={bw} height={Math.max(0, T + ih - y(outgoing[i]))} rx="3" fill="#A9812F" />
                  {incoming[i] > 0 && <text x={cx - bw / 2 - 2} y={y(incoming[i]) - 5} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#1B3358">{incoming[i]}</text>}
                  {outgoing[i] > 0 && <text x={cx + bw / 2 + 2} y={y(outgoing[i]) - 5} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#7A5C1E">{outgoing[i]}</text>}
                  <text x={cx} y={H - 9} textAnchor="middle" fontSize="11.5" fill="#475266">{lb}</text>
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