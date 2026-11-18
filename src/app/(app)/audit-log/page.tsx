import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getProfileMap } from "@/lib/data";
import { Card, EmptyState, ErrorState, PageHeader, Pagination, tableClass, inputClass, SubmitButton } from "@/components/ui";
import { firstParam, formatDateTime, sanitizeSearch } from "@/lib/utils";

export const metadata = { title: "Audit log" };
const SIZE = 25;

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await requirePermission("audit_logs.view");
  const sb = createClient();
  const q = sanitizeSearch(firstParam(searchParams.q)).toUpperCase().replace(/ /g, "_");
  const page = Math.max(1, parseInt(firstParam(searchParams.page) || "1", 10) || 1);
  let query = sb.from("audit_logs").select("id, actor_id, action, entity_type, entity_id, metadata, created_at", { count: "exact" });
  if (q) query = query.ilike("action", `%${q}%`);
  const { data, count, error } = await query.order("created_at", { ascending: false }).range((page - 1) * SIZE, page * SIZE - 1);
  const names = await getProfileMap(sb, (data ?? []).map((r: any) => r.actor_id));
  return (
    <>
      <PageHeader title="Audit log" description="Catatan tidak dapat diubah. Isi surat dan data rahasia tidak dicatat." />
      <Card>
        <form className="mb-5 flex gap-3" role="search"><div className="max-w-xs flex-1"><label htmlFor="q" className="sr-only">Filter aksi</label><input id="q" name="q" defaultValue={firstParam(searchParams.q)} placeholder="Filter aksi, mis. APPROVE" className={inputClass} /></div><SubmitButton variant="secondary">Terapkan</SubmitButton></form>
        {error ? <ErrorState message="Audit log tidak dapat dimuat." /> : !data?.length ? <EmptyState title="Tidak ada catatan" /> : (
          <>
            <div className={tableClass.wrap}><table className={tableClass.table}>
              <caption className="sr-only">Audit log</caption>
              <thead><tr><th scope="col" className={tableClass.th}>Waktu</th><th scope="col" className={tableClass.th}>Pelaku</th><th scope="col" className={tableClass.th}>Aksi</th><th scope="col" className={tableClass.th}>Objek</th><th scope="col" className={tableClass.th}>Rincian</th></tr></thead>
              <tbody>{data.map((r: any) => (
                <tr key={r.id}><td className={tableClass.td + " whitespace-nowrap tabular-nums"}>{formatDateTime(r.created_at)}</td><td className={tableClass.td}>{names[r.actor_id] ?? (r.actor_id ? "-" : "Sistem")}</td>
                  <td className={tableClass.td + " font-medium"}>{r.action}</td><td className={tableClass.td}>{r.entity_type}<p className="max-w-[10rem] truncate text-xs text-ink-mute">{r.entity_id}</p></td>
                  <td className={tableClass.td + " max-w-xs break-words text-xs text-ink-soft"}>{Object.keys(r.metadata ?? {}).length ? JSON.stringify(r.metadata) : "-"}</td></tr>))}</tbody>
            </table></div>
            <Pagination page={page} total={count ?? 0} pageSize={SIZE} basePath="/audit-log" params={q ? { q: firstParam(searchParams.q) } : {}} />
          </>
        )}
      </Card>
    </>
  );
}
