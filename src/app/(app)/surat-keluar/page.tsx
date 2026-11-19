import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, ErrorState, Flash, LinkButton, PageHeader, Pagination, StatusBadge } from "@/components/ui";
import { FilterBar, LetterRow, ListShell, StatusChips } from "@/components/letters";
import { firstParam, formatDate, sanitizeSearch } from "@/lib/utils";
import { OUTGOING_STATUS, PAGE_SIZE, STATUS_LABEL } from "@/lib/constants";
import { CalendarDays, Hash, Lock, Send } from "lucide-react";

export const metadata = { title: "Surat keluar" };
type Row = Record<string, any>;

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const s = await requirePermission("letters.outgoing.view", "letters.outgoing.create");
  const sb = createClient();
  const q = sanitizeSearch(firstParam(searchParams.q));
  const status = (OUTGOING_STATUS as readonly string[]).includes(firstParam(searchParams.status)) ? firstParam(searchParams.status) : "";
  const page = Math.max(1, parseInt(firstParam(searchParams.page) || "1", 10) || 1);

  const apply = (qb: any, withStatus: boolean) => {
    if (q) qb = qb.or(`subject.ilike.%${q}%,recipient.ilike.%${q}%,number.ilike.%${q}%`);
    if (withStatus && status) qb = qb.eq("status", status);
    return qb;
  };
  const [list, counts] = await Promise.all([
    apply(sb.from("outgoing_letters").select("id, number, recipient, subject, letter_date, status, is_confidential, version", { count: "exact" }), true)
      .order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    apply(sb.from("outgoing_letters").select("status").limit(5000), false),
  ]);
  const rows = (list.data ?? []) as Row[];
  const all = (counts.data ?? []) as Row[];
  const chips = [{ value: "", label: "Semua", count: all.length }, ...OUTGOING_STATUS.map((x) => ({ value: x, label: STATUS_LABEL[x], count: all.filter((r) => r.status === x).length }))];
  const filtered = !!(q || status);
  const base: Record<string, string> = q ? { q } : {};
  const params = status ? { ...base, status } : base;
  const canCreate = can(s.permissions, "letters.outgoing.create");

  return (
    <div className="space-y-5">
      <PageHeader title="Surat keluar" description="Draft, pemeriksaan, persetujuan, penomoran, dan pengiriman surat."
        action={canCreate ? <LinkButton href="/surat-keluar/baru">Buat surat</LinkButton> : undefined} />
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />
      <FilterBar q={q} placeholder="Cari perihal, tujuan, nomor surat" hidden={status ? { status } : undefined} resetHref="/surat-keluar" active={filtered} />
      <StatusChips basePath="/surat-keluar" params={base} active={status} items={chips} />

      {list.error ? <ErrorState message="Daftar surat tidak dapat dimuat. Coba lagi." /> : !rows.length ? (
        <div className="rounded-xl border border-line bg-surface-card shadow-card">
          <EmptyState title={filtered ? "Tidak ada surat yang cocok" : "Belum ada surat keluar"} description={filtered ? "Ubah atau reset filter." : "Buat draft pertama untuk memulai alur persetujuan."}
            action={!filtered && canCreate ? <LinkButton href="/surat-keluar/baru">Buat surat</LinkButton> : undefined} />
        </div>
      ) : (
        <>
          <ListShell>
            {rows.map((l) => (
              <LetterRow key={l.id} href={`/surat-keluar/${l.id}`} icon={l.is_confidential ? Lock : Send} tone={l.is_confidential ? "bad" : "default"}
                title={l.subject} subtitle={`Kepada ${l.recipient}`}
                meta={<><span className="inline-flex items-center gap-1 tabular-nums"><Hash className="h-3.5 w-3.5" aria-hidden />{l.number ?? "Nomor belum diberikan"}</span><span className="inline-flex items-center gap-1 tabular-nums"><CalendarDays className="h-3.5 w-3.5" aria-hidden />{formatDate(l.letter_date)}</span>{l.version > 1 && <span>Versi {l.version}</span>}</>}
                right={<StatusBadge value={l.status} />} />
            ))}
          </ListShell>
          <Pagination page={page} total={list.count ?? 0} pageSize={PAGE_SIZE} basePath="/surat-keluar" params={params} />
        </>
      )}
    </div>
  );
}