import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, ErrorState, Flash, inputClass, LinkButton, PageHeader, Pagination, StatusBadge } from "@/components/ui";
import { FilterBar, LetterRow, ListShell, StatusChips, TestBadge } from "@/components/letters";
import { firstParam, formatDate, sanitizeSearch } from "@/lib/utils";
import { INCOMING_STATUS, NATURES, PAGE_SIZE, STATUS_LABEL } from "@/lib/constants";
import { CalendarDays, Lock, MailOpen } from "lucide-react";

export const metadata = { title: "Surat masuk" };
type Row = Record<string, any>;

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const s = await requirePermission("letters.incoming.view");
  const sb = createClient();
  const q = sanitizeSearch(firstParam(searchParams.q));
  const status = (INCOMING_STATUS as readonly string[]).includes(firstParam(searchParams.status)) ? firstParam(searchParams.status) : "";
  const nature = (NATURES as readonly string[]).includes(firstParam(searchParams.nature)) ? firstParam(searchParams.nature) : "";
  const re = /^\d{4}-\d{2}-\d{2}$/;
  const from = re.test(firstParam(searchParams.from)) ? firstParam(searchParams.from) : "";
  const to = re.test(firstParam(searchParams.to)) ? firstParam(searchParams.to) : "";
  const page = Math.max(1, parseInt(firstParam(searchParams.page) || "1", 10) || 1);

  const apply = (qb: any, withStatus: boolean) => {
    if (q) qb = qb.or(`subject.ilike.%${q}%,sender.ilike.%${q}%,external_number.ilike.%${q}%,origin_org.ilike.%${q}%`);
    if (nature) qb = qb.eq("nature", nature);
    if (from) qb = qb.gte("received_date", from);
    if (to) qb = qb.lte("received_date", to);
    if (withStatus && status) qb = qb.eq("status", status);
    return qb;
  };
  const [list, counts] = await Promise.all([
    apply(sb.from("incoming_letters").select("id, external_number, sender, origin_org, subject, received_date, status, nature, is_confidential, is_test", { count: "exact" }), true)
      .order("received_date", { ascending: false }).order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    apply(sb.from("incoming_letters").select("status").limit(5000), false),
  ]);
  const rows = (list.data ?? []) as Row[];
  const all = (counts.data ?? []) as Row[];
  const chips = [{ value: "", label: "Semua", count: all.length }, ...INCOMING_STATUS.filter((x) => x !== "DITERIMA").map((x) => ({ value: x, label: STATUS_LABEL[x], count: all.filter((r) => r.status === x).length }))];

  const filtered = !!(q || status || nature || from || to);
  const base: Record<string, string> = {};
  if (q) base.q = q; if (nature) base.nature = nature; if (from) base.from = from; if (to) base.to = to;
  const params = status ? { ...base, status } : base;

  return (
    <div className="space-y-5">
      <PageHeader title="Surat masuk" description="Surat yang diterima sekolah, dari pencatatan sampai pengarsipan."
        action={can(s.permissions, "letters.incoming.create") ? <LinkButton href="/surat-masuk/baru">Catat surat masuk</LinkButton> : undefined} />
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />
      <FilterBar q={q} placeholder="Cari perihal, pengirim, nomor surat" hidden={status ? { status } : undefined} resetHref="/surat-masuk" active={filtered}>
        <div><label htmlFor="nature" className="sr-only">Sifat</label>
          <select id="nature" name="nature" defaultValue={nature} className={inputClass + " w-auto"}><option value="">Semua sifat</option>{NATURES.map((x) => <option key={x} value={x}>{STATUS_LABEL[x]}</option>)}</select></div>
        <div><label htmlFor="from" className="sr-only">Diterima dari</label><input id="from" name="from" type="date" defaultValue={from} className={inputClass + " w-auto"} title="Diterima dari" /></div>
        <div><label htmlFor="to" className="sr-only">Diterima sampai</label><input id="to" name="to" type="date" defaultValue={to} className={inputClass + " w-auto"} title="Diterima sampai" /></div>
      </FilterBar>
      <StatusChips basePath="/surat-masuk" params={base} active={status} items={chips} />

      {list.error ? <ErrorState message="Daftar surat tidak dapat dimuat. Coba lagi." /> : !rows.length ? (
        <div className="rounded-xl border border-line bg-surface-card shadow-card">
          <EmptyState title={filtered ? "Tidak ada surat yang cocok" : "Belum ada surat masuk"} description={filtered ? "Ubah atau reset filter pencarian." : "Surat yang dicatat akan tampil di sini."}
            action={!filtered && can(s.permissions, "letters.incoming.create") ? <LinkButton href="/surat-masuk/baru">Catat surat masuk</LinkButton> : undefined} />
        </div>
      ) : (
        <>
          <ListShell>
            {rows.map((l) => (
              <LetterRow key={l.id} href={`/surat-masuk/${l.id}`} icon={l.is_confidential ? Lock : MailOpen} tone={l.is_confidential ? "bad" : "default"}
                title={l.subject} subtitle={`${l.sender}${l.origin_org ? " - " + l.origin_org : ""}`}
                meta={<><span className="inline-flex items-center gap-1 tabular-nums"><CalendarDays className="h-3.5 w-3.5" aria-hidden />Diterima {formatDate(l.received_date)}</span>{l.external_number && <span className="tabular-nums">No. {l.external_number}</span>}</>}
                right={<><StatusBadge value={l.status} />{l.nature !== "BIASA" && <StatusBadge value={l.nature} />}{l.is_test && <TestBadge />}</>} />
            ))}
          </ListShell>
          <Pagination page={page} total={list.count ?? 0} pageSize={PAGE_SIZE} basePath="/surat-masuk" params={params} />
        </>
      )}
    </div>
  );
}