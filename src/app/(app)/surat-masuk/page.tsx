import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, ErrorState, Flash, inputClass, LinkButton, PageHeader, Pagination, StatusBadge, SubmitButton, tableClass, buttonClass } from "@/components/ui";
import { firstParam, formatDate, sanitizeSearch } from "@/lib/utils";
import { INCOMING_STATUS, NATURES, PAGE_SIZE, STATUS_LABEL } from "@/lib/constants";
import { Lock } from "lucide-react";

export const metadata = { title: "Surat masuk" };

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const s = await requirePermission("letters.incoming.view");
  const sb = createClient();
  const q = sanitizeSearch(firstParam(searchParams.q));
  const status = firstParam(searchParams.status);
  const nature = firstParam(searchParams.nature);
  const from = firstParam(searchParams.from);
  const to = firstParam(searchParams.to);
  const page = Math.max(1, parseInt(firstParam(searchParams.page) || "1", 10) || 1);

  let query = sb.from("incoming_letters").select("id, external_number, sender, subject, received_date, status, nature, is_confidential", { count: "exact" });
  if (q) query = query.or(`subject.ilike.%${q}%,sender.ilike.%${q}%,external_number.ilike.%${q}%,origin_org.ilike.%${q}%`);
  if ((INCOMING_STATUS as readonly string[]).includes(status)) query = query.eq("status", status);
  if ((NATURES as readonly string[]).includes(nature)) query = query.eq("nature", nature);
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) query = query.gte("received_date", from);
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) query = query.lte("received_date", to);
  const { data, count, error } = await query.order("received_date", { ascending: false }).order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const filtered = !!(q || status || nature || from || to);
  const params: Record<string, string> = {};
  if (q) params.q = q; if (status) params.status = status; if (nature) params.nature = nature; if (from) params.from = from; if (to) params.to = to;

  return (
    <>
      <PageHeader title="Surat masuk" description="Surat yang diterima sekolah, dari pencatatan sampai pengarsipan."
        action={can(s.permissions, "letters.incoming.create") ? <LinkButton href="/surat-masuk/baru">Catat surat masuk</LinkButton> : undefined} />
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />
      <Card>
        <form className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]" role="search">
          <div><label htmlFor="q" className="sr-only">Cari</label><input id="q" name="q" defaultValue={q} placeholder="Cari perihal, pengirim, nomor" className={inputClass} /></div>
          <div><label htmlFor="status" className="sr-only">Status</label>
            <select id="status" name="status" defaultValue={status} className={inputClass}><option value="">Semua status</option>{INCOMING_STATUS.map((x) => <option key={x} value={x}>{STATUS_LABEL[x]}</option>)}</select></div>
          <div><label htmlFor="nature" className="sr-only">Sifat</label>
            <select id="nature" name="nature" defaultValue={nature} className={inputClass}><option value="">Semua sifat</option>{NATURES.map((x) => <option key={x} value={x}>{STATUS_LABEL[x]}</option>)}</select></div>
          <div><label htmlFor="from" className="sr-only">Diterima dari</label><input id="from" name="from" type="date" defaultValue={from} className={inputClass} title="Diterima dari" /></div>
          <div><label htmlFor="to" className="sr-only">Diterima sampai</label><input id="to" name="to" type="date" defaultValue={to} className={inputClass} title="Diterima sampai" /></div>
          <div className="flex gap-2"><SubmitButton variant="secondary">Terapkan</SubmitButton>{filtered && <Link href="/surat-masuk" className={buttonClass("ghost")}>Reset</Link>}</div>
        </form>
        {error ? <ErrorState message="Daftar surat tidak dapat dimuat. Coba lagi." /> : !data?.length ? (
          <EmptyState title={filtered ? "Tidak ada surat yang cocok" : "Belum ada surat masuk"} description={filtered ? "Ubah atau reset filter pencarian." : "Surat yang dicatat akan tampil di sini."}
            action={!filtered && can(s.permissions, "letters.incoming.create") ? <LinkButton href="/surat-masuk/baru">Catat surat masuk</LinkButton> : undefined} />
        ) : (
          <>
            <div className={tableClass.wrap}>
              <table className={tableClass.table}>
                <caption className="sr-only">Daftar surat masuk</caption>
                <thead><tr><th scope="col" className={tableClass.th}>Perihal</th><th scope="col" className={tableClass.th}>Pengirim</th><th scope="col" className={tableClass.th}>Diterima</th><th scope="col" className={tableClass.th}>Sifat</th><th scope="col" className={tableClass.th}>Status</th></tr></thead>
                <tbody>
                  {data.map((l: any) => (
                    <tr key={l.id} className="hover:bg-surface">
                      <td className={tableClass.td}>
                        <Link href={`/surat-masuk/${l.id}`} className="font-medium text-navy-800 hover:underline">{l.is_confidential && <Lock className="mr-1 inline h-3.5 w-3.5 text-bad" aria-label="Rahasia" />}{l.subject}</Link>
                        {l.external_number && <p className="mt-0.5 text-xs text-ink-mute tabular-nums">{l.external_number}</p>}
                      </td>
                      <td className={tableClass.td}>{l.sender}</td>
                      <td className={tableClass.td + " whitespace-nowrap tabular-nums"}>{formatDate(l.received_date)}</td>
                      <td className={tableClass.td}><StatusBadge value={l.nature} /></td>
                      <td className={tableClass.td}><StatusBadge value={l.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={count ?? 0} pageSize={PAGE_SIZE} basePath="/surat-masuk" params={params} />
          </>
        )}
      </Card>
    </>
  );
}
