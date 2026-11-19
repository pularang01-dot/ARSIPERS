import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getProfileMap } from "@/lib/data";
import { EmptyState, ErrorState, Flash, PageHeader, StatusBadge } from "@/components/ui";
import { Avatar, StatusChips } from "@/components/letters";
import { cn, firstParam, formatDate, todayJakarta } from "@/lib/utils";
import { CalendarClock } from "lucide-react";

export const metadata = { title: "Disposisi" };
type Row = Record<string, any>;

const EDGE: Record<string, string> = { MENDESAK: "border-l-bad", TINGGI: "border-l-brass", NORMAL: "border-l-navy-600", RENDAH: "border-l-line-strong" };

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const s = await requireSession();
  const sb = createClient();
  const scope = firstParam(searchParams.tampil) === "semua" ? "semua" : "saya";
  const filter = ["selesai", "semua"].includes(firstParam(searchParams.status)) ? firstParam(searchParams.status) : "aktif";

  let q = sb.from("letter_dispositions").select("id, assigned_to, instruction, priority, due_date, status, created_at, incoming:incoming_letters(subject, is_confidential)").order("due_date", { ascending: true, nullsFirst: false }).limit(300);
  if (scope === "saya") q = q.eq("assigned_to", s.userId);
  const { data, error } = await q;
  const all = (data ?? []) as Row[];
  const names = await getProfileMap(sb, all.map((d) => d.assigned_to));
  const today = todayJakarta();
  const daysLeft = (d: string) => Math.round((new Date(d + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86400000);

  const active = all.filter((d) => d.status !== "SELESAI");
  const done = all.filter((d) => d.status === "SELESAI");
  const shown = filter === "aktif" ? active : filter === "selesai" ? done : all;

  const groups: { key: string; title: string; rows: Row[]; tone?: string }[] = filter === "aktif" ? [
    { key: "late", title: "Lewat tenggat", tone: "text-bad", rows: active.filter((d) => d.due_date && d.due_date < today) },
    { key: "soon", title: "Segera, 3 hari ke depan", tone: "text-brass-dark", rows: active.filter((d) => d.due_date && d.due_date >= today && daysLeft(d.due_date) <= 3) },
    { key: "later", title: "Mendatang", rows: active.filter((d) => d.due_date && daysLeft(d.due_date) > 3) },
    { key: "none", title: "Tanpa tenggat", rows: active.filter((d) => !d.due_date) },
  ] : [{ key: "all", title: filter === "selesai" ? "Selesai" : "Semua disposisi", rows: shown }];

  const base: Record<string, string> = scope === "semua" ? { tampil: "semua" } : {};
  const chips = [{ value: "", label: "Aktif", count: active.length }, { value: "selesai", label: "Selesai", count: done.length }, { value: "semua", label: "Semua", count: all.length }];

  return (
    <div className="space-y-5">
      <PageHeader title="Disposisi" description={scope === "saya" ? "Tugas tindak lanjut surat yang diberikan kepada Anda." : "Semua disposisi yang dapat Anda lihat."} />
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-line-strong bg-white p-0.5 text-sm" role="tablist" aria-label="Cakupan">
          <Link role="tab" aria-selected={scope === "saya"} href={filter === "aktif" ? "/disposisi" : `/disposisi?status=${filter}`} className={cn("rounded-md px-3.5 py-1.5", scope === "saya" ? "bg-navy-800 font-medium text-white" : "text-ink-soft hover:text-ink")}>Untuk saya</Link>
          <Link role="tab" aria-selected={scope === "semua"} href={`/disposisi?tampil=semua${filter === "aktif" ? "" : `&status=${filter}`}`} className={cn("rounded-md px-3.5 py-1.5", scope === "semua" ? "bg-navy-800 font-medium text-white" : "text-ink-soft hover:text-ink")}>Semua yang terlihat</Link>
        </div>
        <StatusChips basePath="/disposisi" params={base} active={filter === "aktif" ? "" : filter} items={chips} />
      </div>

      {error ? <ErrorState message="Disposisi tidak dapat dimuat." /> : !shown.length ? (
        <div className="rounded-xl border border-line bg-surface-card shadow-card"><EmptyState title={filter === "aktif" ? "Tidak ada disposisi aktif" : "Tidak ada disposisi"} description="Disposisi baru akan muncul di sini dan pada notifikasi Anda." /></div>
      ) : (
        <div className="space-y-7">
          {groups.filter((g) => g.rows.length).map((g) => (
            <section key={g.key} aria-labelledby={`g-${g.key}`}>
              <h2 id={`g-${g.key}`} className={cn("mb-3 flex items-center gap-2 text-sm font-semibold", g.tone ?? "text-ink-soft")}>{g.title}<span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium tabular-nums text-ink-soft shadow-card">{g.rows.length}</span></h2>
              <ul className="grid gap-3 md:grid-cols-2">
                {g.rows.map((d) => {
                  const late = d.due_date && d.due_date < today && d.status !== "SELESAI";
                  const left = d.due_date ? daysLeft(d.due_date) : null;
                  return (
                    <li key={d.id}>
                      <Link href={`/disposisi/${d.id}`} className={cn("group flex h-full flex-col rounded-xl border border-l-4 border-line bg-surface-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600", EDGE[d.priority] ?? "border-l-navy-600")}>
                        <div className="flex items-start justify-between gap-3">
                          <p className="line-clamp-2 text-[15px] font-medium text-ink group-hover:text-navy-800">{d.incoming?.is_confidential ? "Surat rahasia" : d.incoming?.subject ?? "Surat"}</p>
                          <StatusBadge value={d.status} />
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{d.instruction}</p>
                        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4 text-xs">
                          <span className="flex items-center gap-2 text-ink-soft"><Avatar name={names[d.assigned_to] ?? "?"} size={24} />{names[d.assigned_to] ?? "-"}</span>
                          <span className="flex items-center gap-2">
                            <StatusBadge value={d.priority} />
                            {d.due_date && <span className={cn("inline-flex items-center gap-1 tabular-nums", late ? "font-semibold text-bad" : left !== null && left <= 3 && d.status !== "SELESAI" ? "font-medium text-brass-dark" : "text-ink-mute")}><CalendarClock className="h-3.5 w-3.5" aria-hidden />{late ? `Lewat ${Math.abs(left!)} hari` : left === 0 ? "Hari ini" : formatDate(d.due_date)}</span>}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}