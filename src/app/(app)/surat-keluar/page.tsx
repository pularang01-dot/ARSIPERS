import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, ErrorState, Flash, inputClass, LinkButton, PageHeader, Pagination, StatusBadge, SubmitButton, tableClass, buttonClass } from "@/components/ui";
import { firstParam, formatDate, sanitizeSearch } from "@/lib/utils";
import { OUTGOING_STATUS, PAGE_SIZE, STATUS_LABEL } from "@/lib/constants";
import { Lock } from "lucide-react";

export const metadata = { title: "Surat keluar" };

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const s = await requirePermission("letters.outgoing.view", "letters.outgoing.create");
  const sb = createClient();
  const q = sanitizeSearch(firstParam(searchParams.q));
  const status = firstParam(searchParams.status);
  const page = Math.max(1, parseInt(firstParam(searchParams.page) || "1", 10) || 1);
  let query = sb.from("outgoing_letters").select("id, number, recipient, subject, letter_date, status, is_confidential, version", { count: "exact" });
  if (q) query = query.or(`subject.ilike.%${q}%,recipient.ilike.%${q}%,number.ilike.%${q}%`);
  if ((OUTGOING_STATUS as readonly string[]).includes(status)) query = query.eq("status", status);
  const { data, count, error } = await query.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const filtered = !!(q || status);
  const params: Record<string, string> = {}; if (q) params.q = q; if (status) params.status = status;
  return (
    <>
      <PageHeader title="Surat keluar" description="Draft, pemeriksaan, persetujuan, penomoran, dan pengiriman surat."
        action={can(s.permissions, "letters.outgoing.create") ? <LinkButton href="/surat-keluar/baru">Buat surat</LinkButton> : undefined} />
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />
      <Card>
        <form className="mb-5 grid gap-3 sm:grid-cols-[2fr_1fr_auto]" role="search">
          <div><label htmlFor="q" className="sr-only">Cari</label><input id="q" name="q" defaultValue={q} placeholder="Cari perihal, tujuan, nomor surat" className={inputClass} /></div>
          <div><label htmlFor="status" className="sr-only">Status</label><select id="status" name="status" defaultValue={status} className={inputClass}><option value="">Semua status</option>{OUTGOING_STATUS.map((x) => <option key={x} value={x}>{STATUS_LABEL[x]}</option>)}</select></div>
          <div className="flex gap-2"><SubmitButton variant="secondary">Terapkan</SubmitButton>{filtered && <Link href="/surat-keluar" className={buttonClass("ghost")}>Reset</Link>}</div>
        </form>
        {error ? <ErrorState message="Daftar surat tidak dapat dimuat. Coba lagi." /> : !data?.length ? (
          <EmptyState title={filtered ? "Tidak ada surat yang cocok" : "Belum ada surat keluar"} description={filtered ? "Ubah atau reset filter." : "Buat draft pertama untuk memulai alur persetujuan."} action={!filtered && can(s.permissions, "letters.outgoing.create") ? <LinkButton href="/surat-keluar/baru">Buat surat</LinkButton> : undefined} />
        ) : (
          <>
            <div className={tableClass.wrap}><table className={tableClass.table}>
              <caption className="sr-only">Daftar surat keluar</caption>
              <thead><tr><th scope="col" className={tableClass.th}>Perihal</th><th scope="col" className={tableClass.th}>Tujuan</th><th scope="col" className={tableClass.th}>Tanggal</th><th scope="col" className={tableClass.th}>Status</th></tr></thead>
              <tbody>{data.map((l: any) => (
                <tr key={l.id} className="hover:bg-surface">
                  <td className={tableClass.td}><Link href={`/surat-keluar/${l.id}`} className="font-medium text-navy-800 hover:underline">{l.is_confidential && <Lock className="mr-1 inline h-3.5 w-3.5 text-bad" aria-label="Rahasia" />}{l.subject}</Link>
                    <p className="mt-0.5 text-xs text-ink-mute tabular-nums">{l.number ?? "Nomor belum diberikan"}{l.version > 1 ? ` - versi ${l.version}` : ""}</p></td>
                  <td className={tableClass.td}>{l.recipient}</td>
                  <td className={tableClass.td + " whitespace-nowrap tabular-nums"}>{formatDate(l.letter_date)}</td>
                  <td className={tableClass.td}><StatusBadge value={l.status} /></td>
                </tr>))}</tbody>
            </table></div>
            <Pagination page={page} total={count ?? 0} pageSize={PAGE_SIZE} basePath="/surat-keluar" params={params} />
          </>
        )}
      </Card>
    </>
  );
}
