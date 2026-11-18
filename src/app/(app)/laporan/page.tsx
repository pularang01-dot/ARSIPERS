import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, Field, inputClass, LinkButton, PageHeader, StatCard, SubmitButton, tableClass } from "@/components/ui";
import { firstParam } from "@/lib/utils";
import { INCOMING_STATUS, OUTGOING_STATUS, STATUS_LABEL } from "@/lib/constants";

export const metadata = { title: "Laporan" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await requirePermission("reports.view");
  const sb = createClient();
  const year = new Date().getFullYear();
  const re = /^\d{4}-\d{2}-\d{2}$/;
  const from = re.test(firstParam(searchParams.from)) ? firstParam(searchParams.from) : `${year}-01-01`;
  const to = re.test(firstParam(searchParams.to)) ? firstParam(searchParams.to) : `${year}-12-31`;
  const [{ data: inc }, { data: out }] = await Promise.all([
    sb.from("incoming_letters").select("received_date, status").gte("received_date", from).lte("received_date", to).limit(10000),
    sb.from("outgoing_letters").select("letter_date, status").gte("letter_date", from).lte("letter_date", to).limit(10000),
  ]);
  const byStatus = (rows: any[] | null, order: readonly string[]) => order.map((s) => ({ s, n: (rows ?? []).filter((r) => r.status === s).length }));
  const byMonth = (rows: any[] | null, key: string) => { const m = Array(12).fill(0); (rows ?? []).forEach((r) => { m[parseInt(String(r[key]).slice(5, 7), 10) - 1]++; }); return m as number[]; };
  const mi = byMonth(inc, "received_date"); const mo = byMonth(out, "letter_date");
  const qs = `from=${from}&to=${to}`;
  return (
    <>
      <PageHeader title="Laporan" description="Rekap surat per periode. Data mengikuti hak akses Anda." />
      <Card className="mb-6">
        <form className="flex flex-wrap items-end gap-3" role="search">
          <Field label="Dari" htmlFor="from"><input id="from" name="from" type="date" defaultValue={from} className={inputClass} /></Field>
          <Field label="Sampai" htmlFor="to"><input id="to" name="to" type="date" defaultValue={to} className={inputClass} /></Field>
          <SubmitButton variant="secondary">Terapkan</SubmitButton>
          <LinkButton href={`/api/reports/export?jenis=masuk&${qs}`} variant="secondary">Ekspor surat masuk (CSV)</LinkButton>
          <LinkButton href={`/api/reports/export?jenis=keluar&${qs}`} variant="secondary">Ekspor surat keluar (CSV)</LinkButton>
        </form>
      </Card>
      <div className="mb-6 grid gap-3 sm:grid-cols-2"><StatCard label="Surat masuk pada periode" value={inc?.length ?? 0} /><StatCard label="Surat keluar pada periode" value={out?.length ?? 0} /></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Surat masuk per status"><table className="w-full text-sm"><tbody>{byStatus(inc, INCOMING_STATUS).map((r) => <tr key={r.s}><th scope="row" className="py-1.5 text-left font-normal text-ink-soft">{STATUS_LABEL[r.s]}</th><td className="py-1.5 text-right tabular-nums">{r.n}</td></tr>)}</tbody></table></Card>
        <Card title="Surat keluar per status"><table className="w-full text-sm"><tbody>{byStatus(out, OUTGOING_STATUS).map((r) => <tr key={r.s}><th scope="row" className="py-1.5 text-left font-normal text-ink-soft">{STATUS_LABEL[r.s]}</th><td className="py-1.5 text-right tabular-nums">{r.n}</td></tr>)}</tbody></table></Card>
      </div>
      <Card title="Per bulan" className="mt-6"><div className={tableClass.wrap}><table className="w-full min-w-[560px] text-sm">
        <thead><tr><th scope="col" className={tableClass.th}> </th>{MONTHS.map((m) => <th key={m} scope="col" className={tableClass.th + " text-right"}>{m}</th>)}</tr></thead>
        <tbody><tr><th scope="row" className="px-4 py-2 text-left font-normal">Masuk</th>{mi.map((n, i) => <td key={i} className="px-4 py-2 text-right tabular-nums">{n}</td>)}</tr>
          <tr><th scope="row" className="px-4 py-2 text-left font-normal">Keluar</th>{mo.map((n, i) => <td key={i} className="px-4 py-2 text-right tabular-nums">{n}</td>)}</tr></tbody>
      </table></div></Card>
    </>
  );
}
