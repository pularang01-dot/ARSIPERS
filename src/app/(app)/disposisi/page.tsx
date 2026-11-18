import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getProfileMap } from "@/lib/data";
import { Card, EmptyState, ErrorState, Flash, PageHeader, StatusBadge, tableClass } from "@/components/ui";
import { firstParam, formatDate } from "@/lib/utils";

export const metadata = { title: "Disposisi" };

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const s = await requireSession();
  const sb = createClient();
  const scope = firstParam(searchParams.tampil) === "semua" ? "semua" : "saya";
  let q = sb.from("letter_dispositions").select("id, assigned_to, instruction, priority, due_date, status, incoming:incoming_letters(subject, is_confidential)").order("due_date", { ascending: true, nullsFirst: false }).limit(100);
  if (scope === "saya") q = q.eq("assigned_to", s.userId);
  const { data, error } = await q;
  const names = await getProfileMap(sb, (data ?? []).map((d: any) => d.assigned_to));
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHeader title="Disposisi" description={scope === "saya" ? "Disposisi yang ditugaskan kepada Anda." : "Disposisi yang dapat Anda lihat."} />
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />
      <div className="mb-4 flex gap-2 text-sm" role="tablist" aria-label="Cakupan">
        <Link role="tab" aria-selected={scope === "saya"} href="/disposisi" className={`rounded-md px-3 py-1.5 ${scope === "saya" ? "bg-navy-800 text-white" : "border border-line bg-white"}`}>Untuk saya</Link>
        <Link role="tab" aria-selected={scope === "semua"} href="/disposisi?tampil=semua" className={`rounded-md px-3 py-1.5 ${scope === "semua" ? "bg-navy-800 text-white" : "border border-line bg-white"}`}>Semua yang terlihat</Link>
      </div>
      <Card>
        {error ? <ErrorState message="Disposisi tidak dapat dimuat." /> : !data?.length ? <EmptyState title="Tidak ada disposisi" description="Disposisi baru akan muncul di sini dan pada notifikasi Anda." /> : (
          <div className={tableClass.wrap}><table className={tableClass.table}>
            <caption className="sr-only">Daftar disposisi</caption>
            <thead><tr><th scope="col" className={tableClass.th}>Surat</th><th scope="col" className={tableClass.th}>Instruksi</th><th scope="col" className={tableClass.th}>Penerima</th><th scope="col" className={tableClass.th}>Tenggat</th><th scope="col" className={tableClass.th}>Prioritas</th><th scope="col" className={tableClass.th}>Status</th></tr></thead>
            <tbody>{data.map((d: any) => {
              const late = d.due_date && d.due_date < today && d.status !== "SELESAI";
              return (<tr key={d.id} className="hover:bg-surface">
                <td className={tableClass.td}><Link href={`/disposisi/${d.id}`} className="font-medium text-navy-800 hover:underline">{d.incoming?.is_confidential ? "Surat rahasia" : d.incoming?.subject ?? "Surat"}</Link></td>
                <td className={tableClass.td + " max-w-xs"}><span className="line-clamp-2">{d.instruction}</span></td>
                <td className={tableClass.td}>{names[d.assigned_to] ?? "-"}</td>
                <td className={tableClass.td + " whitespace-nowrap tabular-nums " + (late ? "font-medium text-bad" : "")}>{formatDate(d.due_date)}{late ? " (lewat)" : ""}</td>
                <td className={tableClass.td}><StatusBadge value={d.priority} /></td><td className={tableClass.td}><StatusBadge value={d.status} /></td></tr>);
            })}</tbody>
          </table></div>
        )}
      </Card>
    </>
  );
}
