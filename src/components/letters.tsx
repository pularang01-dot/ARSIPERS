import Link from "next/link";
import { Check, ChevronRight, Download, FileText, Image as ImageIcon, Search, X } from "lucide-react";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/constants";
import { buttonClass, SubmitButton } from "@/components/ui";

type Icon = React.ComponentType<{ className?: string }>;

/* ---------- Kepala halaman detail surat ---------- */
export function LetterHeader({ eyebrow, title, badges, meta, actions }: { eyebrow: string; title: string; badges?: React.ReactNode; meta?: { icon: Icon; text: string }[]; actions?: React.ReactNode }) {
  return (
    <header className="overflow-hidden rounded-xl border border-line border-t-[3px] border-t-brass bg-surface-card p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-dark">{eyebrow}</p>
          <h1 className="mt-1.5 font-display text-[26px] font-semibold leading-snug tracking-tight text-navy-900">{title}</h1>
          {badges && <div className="mt-3 flex flex-wrap items-center gap-2">{badges}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {meta && meta.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-sm text-ink-soft">
          {meta.map((m, i) => { const I = m.icon; return <li key={i} className="flex items-center gap-2"><I className="h-4 w-4 text-ink-mute" aria-hidden /><span className="tabular-nums">{m.text}</span></li>; })}
        </ul>
      )}
    </header>
  );
}

/* ---------- Jalur tahapan ---------- */
export function ProgressTrack({ steps, current }: { steps: string[]; current: string }) {
  const idx = steps.indexOf(current);
  const last = steps.length - 1;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface-card px-4 py-5 shadow-card">
      <ol className="flex min-w-[520px]" aria-label="Tahapan surat">
        {steps.map((s, i) => {
          const done = idx > i || (idx === last && i === last);
          const active = idx === i && !done;
          return (
            <li key={s} className="relative flex flex-1 flex-col items-center" aria-current={active ? "step" : undefined}>
              {i > 0 && <span className={cn("absolute left-[-50%] right-[50%] top-[13px] h-0.5", idx >= i ? "bg-navy-700" : "bg-line-strong")} aria-hidden />}
              <span className={cn("relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold",
                done ? "border-navy-700 bg-navy-700 text-white" : active ? "border-brass bg-white text-brass-dark ring-4 ring-brass-soft" : "border-line-strong bg-white text-ink-mute")}>
                {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={cn("mt-2 px-1 text-center text-[11.5px] leading-tight", active ? "font-semibold text-navy-900" : done ? "text-ink-soft" : "text-ink-mute")}>{STATUS_LABEL[s] ?? s}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------- Bilah filter dan chip status ---------- */
export function FilterBar({ q, placeholder, hidden, children, resetHref, active }: { q: string; placeholder: string; hidden?: Record<string, string>; children?: React.ReactNode; resetHref: string; active: boolean }) {
  return (
    <form role="search" className="flex flex-wrap items-center gap-2.5">
      {Object.entries(hidden ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className="relative min-w-[220px] flex-1">
        <label htmlFor="q" className="sr-only">Cari</label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" aria-hidden />
        <input id="q" name="q" defaultValue={q} placeholder={placeholder}
          className="block h-10 w-full rounded-lg border border-line-strong bg-white pl-9 pr-3 text-sm placeholder:text-ink-mute focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600" />
      </div>
      {children}
      <SubmitButton variant="secondary">Terapkan</SubmitButton>
      {active && <Link href={resetHref} className={buttonClass("ghost", "gap-1.5")}><X className="h-4 w-4" aria-hidden />Reset</Link>}
    </form>
  );
}

export function StatusChips({ basePath, params, active, items, param = "status" }: { basePath: string; params: Record<string, string>; active: string; items: { value: string; label: string; count?: number }[]; param?: string }) {
  const href = (v: string) => { const sp = new URLSearchParams({ ...params }); if (v) sp.set(param, v); const qs = sp.toString(); return qs ? `${basePath}?${qs}` : basePath; };
  return (
    <nav aria-label="Filter status" className="-mx-1 overflow-x-auto px-1 pb-1">
      <ul className="flex gap-2">
        {items.map((it) => {
          const on = (active || "") === it.value;
          return (
            <li key={it.value || "all"}>
              <Link href={href(it.value)} aria-current={on ? "true" : undefined}
                className={cn("inline-flex min-h-[36px] items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600",
                  on ? "border-navy-800 bg-navy-800 font-medium text-white" : "border-line-strong bg-white text-ink-soft hover:border-navy-600 hover:text-ink")}>
                {it.label}
                {it.count !== undefined && <span className={cn("rounded-full px-1.5 text-[11px] font-semibold tabular-nums", on ? "bg-white/20 text-white" : it.count ? "bg-surface text-ink-soft" : "text-ink-mute")}>{it.count}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ---------- Baris daftar ---------- */
export function ListShell({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-xl border border-line bg-surface-card shadow-card"><ul className="divide-y divide-line">{children}</ul></div>;
}

export function LetterRow({ href, icon: I, tone = "default", title, subtitle, meta, right }: { href: string; icon: Icon; tone?: "default" | "bad"; title: string; subtitle?: string; meta?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tone === "bad" ? "bg-bad-bg text-bad" : "bg-navy-50 text-navy-700")} aria-hidden><I className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-ink group-hover:text-navy-800">{title}</p>
          {subtitle && <p className="mt-0.5 truncate text-sm text-ink-soft">{subtitle}</p>}
          {meta && <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-mute">{meta}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">{right}</div>
        <ChevronRight className="hidden h-4 w-4 shrink-0 text-line-strong group-hover:text-navy-600 sm:block" aria-hidden />
      </Link>
    </li>
  );
}

/* ---------- Berkas ---------- */
export function FileCard({ id, name, size, mime, date }: { id: string; name: string; size: number; mime: string; date?: string }) {
  const I = mime.startsWith("image/") ? ImageIcon : FileText;
  return (
    <li className="flex items-center gap-3 rounded-lg border border-line bg-white p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700" aria-hidden><I className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{name}</p>
        <p className="text-xs text-ink-mute">{formatBytes(size)}{date ? ` - ${formatDate(date)}` : ""}</p>
      </div>
      <a href={`/api/files/${id}`} className={buttonClass("secondary", "min-h-[36px] gap-1.5 px-3 text-xs")} aria-label={`Unduh ${name}`}><Download className="h-3.5 w-3.5" aria-hidden />Unduh</a>
    </li>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const parts = (name || "?").trim().split(/\s+/);
  const ini = ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
  return <span className="flex shrink-0 items-center justify-center rounded-full bg-brass-soft text-xs font-semibold text-brass-dark" style={{ width: size, height: size }} aria-hidden>{ini}</span>;
}

/* ---------- Formulir ---------- */
export function FormSection({ step, title, description, children }: { step: number; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 border-b border-line py-7 first:pt-0 last:border-0 lg:grid-cols-[230px_1fr] lg:gap-10">
      <div>
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-800 text-xs font-semibold text-white" aria-hidden>{step}</span>
          <h2 className="font-display text-lg font-semibold text-navy-900">{title}</h2>
        </div>
        {description && <p className="mt-2 text-sm leading-relaxed text-ink-soft lg:pl-10">{description}</p>}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function FormActions({ children }: { children: React.ReactNode }) {
  return <div className="sticky bottom-0 -mx-5 -mb-5 mt-2 flex flex-wrap items-center justify-end gap-3 rounded-b-xl border-t border-line bg-white/95 px-5 py-4 backdrop-blur">{children}</div>;
}

export function ChipRadio({ name, options, defaultValue }: { name: string; options: { value: string; label: string; hint?: string }[]; defaultValue: string }) {
  return (
    <div role="radiogroup" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {options.map((o) => (
        <label key={o.value} className="relative cursor-pointer">
          <input type="radio" name={name} value={o.value} defaultChecked={o.value === defaultValue} className="peer sr-only" />
          <span className={cn("flex h-full flex-col rounded-lg border border-line-strong bg-white px-3.5 py-2.5 text-sm transition-colors hover:border-navy-600",
            "peer-checked:border-navy-700 peer-checked:bg-navy-50 peer-checked:ring-1 peer-checked:ring-navy-700 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-navy-600")}>
            <span className="font-medium text-ink">{o.label}</span>
            {o.hint && <span className="text-xs text-ink-mute">{o.hint}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

/** Penanda surat uji coba (dibuat saat mode uji coba aktif). */
export function TestBadge({ className }: { className?: string }) {
  return <span className={cn("inline-block -rotate-2 rounded-[3px] border-2 border-brass-dark px-1.5 py-px text-[10.5px] font-bold uppercase leading-tight tracking-[0.12em] text-brass-dark", className)}>Uji coba</span>;
}