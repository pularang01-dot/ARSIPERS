import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deleteArchived, unarchiveLetter } from "@/features/archive-actions";
import { createClient } from "@/lib/supabase/server";
import { getProfileMap } from "@/lib/data";
import { Card, EmptyState, ErrorState, Field, Flash, inputClass, PageHeader, Pagination, SubmitButton, tableClass, buttonClass } from "@/components/ui";
import { firstParam, formatDate, sanitizeSearch } from "@/lib/utils";
import { PAGE_SIZE } from "@/lib/constants";

export const metadata = { title: "Arsip" };

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const sess = await requirePermission("archives.view");
  const canManage = can(sess.permissions, "archives.manage");
  const canDelete = can(sess.permissions, "archives.delete");
  const sb = createClient();
  const jenis = firstParam(searchParams.jenis);
  const q = sanitizeSearch(firstParam(searchParams.q));
  const from = firstParam(searchParams.from); const to = firstParam(searchParams.to);
  const page = Math.max(1, parseInt(firstParam(searchParams.page) || "1", 10) || 1);
  let query = sb.from("archive_records").select("id, archived_by, archived_at, retention_note, incoming:incoming_letters(id, subject, sender, external_number), outgoing:outgoing_letters(id, subject, recipient, number)", { count: "exact" });
  if (jenis === "masuk") query = query.not("incoming_letter_id", "is", null);
  if (jenis === "keluar") query = query.not("outgoing_letter_id", "is", null);
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) query = query.gte("archived_at", from);
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) query = query.lte("archived_at", to + "T23:59:59");
  const { data, count, error } = await query.order("archived_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  let rows = (data ?? []) as any[];
  if (q) { const lq = q.toLowerCase(); rows = rows.filter((r) => [r.incoming?.subject, r.incoming?.sender, r.incoming?.external_number, r.outgoing?.subject, r.outgoing?.recipient, r.outgoing?.number].some((x) => x?.toLowerCase().includes(lq))); }
  const names = await getProfileMap(sb, rows.map((r) => r.archived_by));
  const params: Record<string, string> = {}; if (jenis) params.jenis = jenis; if (q) params.q = q; if (from) params.from = from; if (to) params.to = to;
  return (
    <>
      <PageHeader title="Arsip digital" description="Surat masuk dan keluar yang sudah diarsipkan. Pencarian teks berlaku pada halaman yang sedang tampil." />
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />
      <Card>
        <form className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]" role="search">
          <div><label htmlFor="q" className="sr-only">Cari</label><input id="q" name="q" defaultValue={q} placeholder="Cari perihal, pihak, nomor" className={inputClass} /></div>
          <div><label htmlFor="jenis" className="sr-only">Jenis</label><select id="jenis" name="jenis" defaultValue={jenis} className={inputClass}><option value="">Semua jenis</option><option value="masuk">Surat masuk</option><option value="keluar">Surat keluar</option></select></div>
          <div><label htmlFor="from" className="sr-only">Diarsipkan dari</label><input id="from" name="from" type="date" defaultValue={from} className={inputClass} title="Diarsipkan dari" /></div>
          <div><label htmlFor="to" className="sr-only">Diarsipkan sampai</label><input id="to" name="to" type="date" defaultValue={to} className={inputClass} title="Diarsipkan sampai" /></div>
          <div className="flex gap-2"><SubmitButton variant="secondary">Terapkan</SubmitButton>{(q || jenis || from || to) && <Link href="/arsip" className={buttonClass("ghost")}>Reset</Link>}</div>
        </form>
        {error ? <ErrorState message="Arsip tidak dapat dimuat." /> : !rows.length ? <EmptyState title="Belum ada arsip" description="Surat yang selesai diproses dan diarsipkan akan tampil di sini." /> : (
          <>
            <div className={tableClass.wrap}><table className={tableClass.table}>
              <caption className="sr-only">Daftar arsip</caption>
              <thead><tr><th scope="col" className={tableClass.th}>Jenis</th><th scope="col" className={tableClass.th}>Perihal</th><th scope="col" className={tableClass.th}>Pihak</th><th scope="col" className={tableClass.th}>Nomor</th><th scope="col" className={tableClass.th}>Diarsipkan</th>{(canManage || canDelete) && <th scope="col" className={tableClass.th}><span className="sr-only">Tindakan</span></th>}</tr></thead>
              <tbody>{rows.map((r) => {
                const inc = r.incoming; const out = r.outgoing;
                return (<tr key={r.id} className="hover:bg-surface"><td className={tableClass.td}>{inc ? "Masuk" : "Keluar"}</td>
                  <td className={tableClass.td}><Link className="font-medium text-navy-800 hover:underline" href={inc ? `/surat-masuk/${inc.id}` : `/surat-keluar/${out?.id}`}>{inc?.subject ?? out?.subject}</Link>{r.retention_note && <p className="mt-0.5 text-xs text-ink-mute">{r.retention_note}</p>}</td>
                  <td className={tableClass.td}>{inc?.sender ?? out?.recipient}</td><td className={tableClass.td + " tabular-nums"}>{inc?.external_number ?? out?.number ?? "-"}</td>
                  <td className={tableClass.td + " whitespace-nowrap"}>{formatDate(r.archived_at)}<p className="text-xs text-ink-mute">{names[r.archived_by]}</p></td>
                  {(canManage || canDelete) && (
                    <td className={tableClass.td}>
                      <form action={unarchiveLetter} className="flex flex-wrap gap-2">
                        <input type="hidden" name="kind" value={inc ? "incoming" : "outgoing"} /><input type="hidden" name="id" value={inc ? inc.id : out?.id} />
                        {canManage && (
                          <ConfirmButton label="Batalkan arsip" title="Batalkan pengarsipan?" confirmLabel="Batalkan arsip"
                            message={`Surat dikembalikan ke status ${inc ? "Selesai" : "Dikirim"} dan keluar dari arsip. Tindakan ini tercatat di audit log.`}>
                            <Field label="Alasan pembatalan" htmlFor={`ua-${r.id}`} required><input id={`ua-${r.id}`} name="reason" required minLength={5} className={inputClass} placeholder="mis. salah memilih surat" /></Field>
                          </ConfirmButton>
                        )}
                        {canDelete && (
                          <ConfirmButton label="Hapus arsip" title="Hapus surat arsip ini?" confirmLabel="Hapus arsip" formAction={deleteArchived}
                            message="Surat disembunyikan dari semua daftar dan tidak dapat dipulihkan lewat aplikasi. Berkas lampiran tidak ikut dihapus dari penyimpanan. Tercatat di audit log. Jika hanya salah mengarsipkan, gunakan Batalkan arsip.">
                            <Field label="Ketik HAPUS untuk konfirmasi" htmlFor={`dc-${r.id}`}><input id={`dc-${r.id}`} name="confirm" autoComplete="off" className={inputClass} /></Field>
                            <Field label="Alasan penghapusan" htmlFor={`dr-${r.id}`}><input id={`dr-${r.id}`} name="delete_reason" className={inputClass} placeholder="mis. surat dicatat dua kali" /></Field>
                          </ConfirmButton>
                        )}
                      </form>
                    </td>
                  )}</tr>);
              })}</tbody>
            </table></div>
            <Pagination page={page} total={count ?? 0} pageSize={PAGE_SIZE} basePath="/arsip" params={params} />
          </>
        )}
      </Card>
    </>
  );
}