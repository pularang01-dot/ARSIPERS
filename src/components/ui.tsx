import Link from "next/link";
import { AlertTriangle, CheckCircle2, Inbox, Lock, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { STATUS_LABEL, STATUS_TONE, type Tone } from "@/lib/constants";

const toneClass: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok", warn: "bg-warn-bg text-warn", bad: "bg-bad-bg text-bad", info: "bg-info-bg text-info", idle: "bg-idle-bg text-idle",
};

export function StatusBadge({ value, tone }: { value: string; tone?: Tone }) {
  const t = tone ?? STATUS_TONE[value] ?? "idle";
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap", toneClass[t])}>
      {STATUS_LABEL[value] ?? value}
    </span>
  );
}

export const btn = {
  base: "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 disabled:cursor-not-allowed disabled:opacity-50",
  primary: "bg-navy-800 text-white hover:bg-navy-700 active:bg-navy-900",
  secondary: "border border-line-strong bg-white text-ink hover:bg-surface",
  danger: "bg-bad text-white hover:opacity-90",
  ghost: "text-ink-soft hover:bg-navy-50",
};
export const buttonClass = (v: "primary" | "secondary" | "danger" | "ghost" = "primary", extra?: string) => cn(btn.base, btn[v], extra);

export function LinkButton({ href, variant = "primary", children, className }: { href: string; variant?: "primary" | "secondary" | "danger" | "ghost"; children: React.ReactNode; className?: string }) {
  return <Link href={href} className={buttonClass(variant, className)}>{children}</Link>;
}

export function SubmitButton({ children, variant = "primary", className, name, value }: { children: React.ReactNode; variant?: "primary" | "secondary" | "danger" | "ghost"; className?: string; name?: string; value?: string }) {
  return <button type="submit" name={name} value={value} className={buttonClass(variant, className)}>{children}</button>;
}

export const inputClass = "block w-full min-h-[40px] rounded-md border border-line-strong bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-mute focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600 disabled:bg-surface";

export function Field({ label, htmlFor, hint, required, optional, children }: { label: string; htmlFor: string; hint?: string; required?: boolean; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}{required && <span className="text-bad" aria-hidden> *</span>}{optional && <span className="ml-1.5 text-xs font-normal text-ink-mute">(opsional)</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-mute">{hint}</p>}
    </div>
  );
}

export function Card({ children, className, title, action }: { children: React.ReactNode; className?: string; title?: string; action?: React.ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-line bg-surface-card shadow-card", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageHeader({ title, description, action, crumbs }: { title: string; description?: string; action?: React.ReactNode; crumbs?: { label: string; href?: string }[] }) {
  return (
    <div className="mb-6">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2 text-xs text-ink-mute">
          <ol className="flex flex-wrap items-center gap-1.5">
            {crumbs.map((c, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {c.href ? <Link href={c.href} className="hover:text-ink hover:underline">{c.label}</Link> : <span aria-current="page">{c.label}</span>}
                {i < crumbs.length - 1 && <span aria-hidden>/</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-navy-900">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-ink-soft">{description}</p>}
        </div>
        {action && <div className="flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return error ? (
    <div role="alert" className="mb-5 flex items-start gap-2 rounded-md border border-bad/30 bg-bad-bg px-4 py-3 text-sm text-bad">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{error}</span>
    </div>
  ) : (
    <div role="status" className="mb-5 flex items-start gap-2 rounded-md border border-ok/30 bg-ok-bg px-4 py-3 text-sm text-ok">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{ok}</span>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <Inbox className="mb-3 h-8 w-8 text-ink-mute" aria-hidden />
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-14 text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-bad" aria-hidden />
      <p className="text-sm font-medium text-ink">Data tidak dapat dimuat</p>
      <p className="mt-1 max-w-sm text-sm text-ink-soft">{message}</p>
    </div>
  );
}

export function PermissionDenied() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <Lock className="mb-3 h-9 w-9 text-ink-mute" aria-hidden />
      <h1 className="font-display text-xl font-semibold text-navy-900">Akses ditolak</h1>
      <p className="mt-2 text-sm text-ink-soft">Akun Anda tidak memiliki izin untuk membuka halaman ini. Hubungi administrator jika Anda merasa ini keliru.</p>
      <LinkButton href="/" variant="secondary" className="mt-5">Kembali ke dashboard</LinkButton>
    </div>
  );
}

export function StatCard({ label, value, hint, href, tone }: { label: string; value: number | string; hint?: string; href?: string; tone?: Tone }) {
  const inner = (
    <div className="h-full rounded-xl border border-line bg-surface-card p-4 shadow-card transition-colors hover:border-line-strong">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-navy-900")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-mute">{hint}</p>}
    </div>
  );
  return href ? <Link href={href} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600 rounded-lg">{inner}</Link> : inner;
}

export function Pagination({ page, total, pageSize, basePath, params }: { page: number; total: number; pageSize: number; basePath: string; params: Record<string, string> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="px-1 pt-3 text-xs text-ink-mute">{total} data</p>;
  const href = (p: number) => {
    const sp = new URLSearchParams({ ...params, page: String(p) });
    return `${basePath}?${sp.toString()}`;
  };
  return (
    <nav aria-label="Halaman" className="flex items-center justify-between gap-3 pt-4 text-sm">
      <span className="text-xs text-ink-mute tabular-nums">Halaman {page} dari {pages} ({total} data)</span>
      <div className="flex gap-2">
        {page > 1 ? <Link className={buttonClass("secondary", "px-3")} href={href(page - 1)}><ChevronLeft className="h-4 w-4" aria-hidden />Sebelumnya</Link> : null}
        {page < pages ? <Link className={buttonClass("secondary", "px-3")} href={href(page + 1)}>Berikutnya<ChevronRight className="h-4 w-4" aria-hidden /></Link> : null}
      </div>
    </nav>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: string }) {
  const idx = steps.indexOf(current);
  return (
    <ol className="flex flex-wrap gap-x-1 gap-y-2" aria-label="Tahapan surat">
      {steps.map((s, i) => {
        const done = idx > i || (idx === steps.length - 1 && i === idx);
        const active = idx === i && !done;
        return (
          <li key={s} className="flex items-center gap-1" aria-current={active ? "step" : undefined}>
            <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
              done ? "border-ok bg-ok text-white" : active ? "border-navy-800 bg-navy-800 text-white" : "border-line-strong text-ink-mute")}>
              {done ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
            </span>
            <span className={cn("mr-2 text-xs", active ? "font-semibold text-navy-900" : done ? "text-ink-soft" : "text-ink-mute")}>{STATUS_LABEL[s] ?? s}</span>
            {i < steps.length - 1 && <span className="mr-1 hidden h-px w-4 bg-line-strong sm:block" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

export type TimelineItem = { id: string; title: string; note?: string | null; at: string; by?: string | null };
export function Timeline({ items }: { items: TimelineItem[] }) {
  if (!items.length) return <p className="text-sm text-ink-mute">Belum ada aktivitas.</p>;
  return (
    <ol className="space-y-4">
      {items.map((it) => (
        <li key={it.id} className="relative border-l border-line-strong pl-4">
          <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-navy-600" aria-hidden />
          <p className="text-sm font-medium text-ink">{it.title}</p>
          {it.note && <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-soft">{it.note}</p>}
          <p className="mt-0.5 text-xs text-ink-mute">{it.by ? `${it.by} - ` : ""}{formatDateTime(it.at)}</p>
        </li>
      ))}
    </ol>
  );
}

export function DefinitionList({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="text-xs text-ink-mute">{i.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-ink">{i.value || "-"}</dd>
        </div>
      ))}
    </dl>
  );
}

export const tableClass = {
  wrap: "overflow-x-auto",
  table: "w-full min-w-[640px] text-left text-sm",
  th: "border-b border-line bg-surface px-4 py-2.5 text-xs font-medium text-ink-soft",
  td: "border-b border-line px-4 py-3 align-top",
};