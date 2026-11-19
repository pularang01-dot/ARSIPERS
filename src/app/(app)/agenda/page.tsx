import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getProfileMap } from "@/lib/data";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deleteArchived, unarchiveLetter } from "@/features/archive-actions";
import { EmptyState, ErrorState, Field, Flash, inputClass, PageHeader, Pagination } from "@/components/ui";
import { FilterBar, StatusChips } from "@/components/letters";
import { KpiCard } from "@/components/dashboard";
import { firstParam, formatDate, sanitizeSearch } from "@/lib/utils";
import { PAGE_SIZE } from "@/lib/constants";
import { Archive, CalendarCheck, Hash, Lock, MailOpen, Send, User } from "lucide-react";

export const metadata = { title: "Arsip" };
type Row = Record<string, any>;
const ZERO = "00000000-0000-0000-0000-000000000000";

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const sess = await requirePermission("archives.view");
  const canManage = can(sess.permissions, "archives.manage");
  const canDelete = can(sess.permissions, "archives.delete");
  const sb = createClient();

  const q = sanitizeSearch(firstParam(searchParams.q));
  const jenis = ["masuk", "keluar"].includes(firstParam(searchParams.jenis)) ? firstParam(searchParams.jenis) : "";
  const re = /^\d{4}-\d{2}-\d{2}$/;
  const from = re.test(firstParam(searchParams.from)) ? firstParam(searchParams.from) : "";
  const to = re.test(firstParam(searchParams.to)) ? firstParam(searchParams.to) : "";
  const page = Math.max(1, parseInt(firstParam(searchParams.page) || "1", 10) || 1);

  // Pencarian teks dilakukan di server: cari surat arsip yang cocok, lalu saring baris arsipnya.
  let ids: { inc: string[]; out: string[] } | null = null;
  if (q) {
    const [i, o] = await Promise.all([
      sb.from("incoming_letters").select("id").eq("status", "DIARSIPKAN").or(`subject.ilike.%${q}%,sender.ilike.%${q}%,external_number.ilike.%${q}%,origin_org.ilike.%${q}%`).limit(500),
      sb.from("outgoing_letters").select("id").eq("status", "DIARSIPKAN").or(`subject.ilike.%${q}%,recipient.ilike.%${q}%,number.ilike.%${q}%`).limit(500),
    ]);
    ids = { inc: ((i.data ?? []) as Row[]).map((r) => r.id as string), out: ((o.data ?? []) as Row[]).map((r) => r.id as string) };
  }
  const apply = (qb: any, kind: string) => {
    if (kind === "masuk") qb = qb.not("incoming_letter_id", "is", null);
    if (kind === "keluar") qb = qb.not("outgoing_letter_id", "is", null);
    if (from) qb = qb.gte("archived_at", `${from}T00:00:00+07:00`);
    if (to) qb = qb.lte("archived_at", `${to}T23:59:59+07:00`);
    if (ids) qb = qb.or(`incoming_letter_id.in.(${ids.inc.length ? ids.inc.join(",") : ZERO}),outgoing_letter_id.in.(${ids.out.length ? ids.out.join(",") : ZERO})`);
    return qb;
  };

  const [list, cIn, cOut] = await Promise.all([
    apply(sb.from("archive_records").select("id, archived_by, archived_at, retention_note, incoming:incoming_letters(id, subject, sender, origin_org, external_number, is_confidential), outgoing:outgoing_letters(id, subject, recipient, number, is_confidential)", { count: "exact" }), jenis)
      .order("archived_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    apply(sb.from("archive_records").select("id", { count: "exact", head: true }), "masuk"),
    apply(sb.from("archive_records").select("id", { count: "exact", head: true }), "keluar"),
  ]);
  const rows = (list.data ?? []) as Row[];
  const names = await getProfileMap(sb, rows.map((r) => r.archived_by as string));
  const nIn = cIn.count ?? 0, nOut = cOut.count ?? 0;

  // Kelompokkan per bulan pengarsipan
  const monthFmt = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
  const groups: { label: string; rows: Row[] }[] = [];
  rows.forEach((r) => {
    const label = monthFmt.format(new Date(r.archived_at as string));
    const g = groups.find((x) => x.label === label);
    if (g) g.rows.push(r); else groups.push({ label, rows: [r] });
  });

  const filtered = !!(q || jenis || from || to);
  const base: Record<string, string> = {};
  if (q) base.q = q; if (from) base.from = from; if (to) base.to = to;
  const params = jenis ? { ...base, jenis } : base;
  const chips = [{ value: "", label: "Semua", count: nIn + nOut }, { value: "masuk", label: "Surat masuk", count: nIn }, { value: "keluar", label: "Surat keluar", count: nOut }];

  return (
    <div className="space-y-6">
      <PageHeader title="Arsip digital" description="Surat masuk dan keluar yang sudah selesai diproses dan disimpan." />
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total arsip" value={nIn + nOut} hint={filtered ? "Sesuai filter" : "Seluruh surat diarsipkan"} icon={Archive} />
        <KpiCard label="Surat masuk" value={nIn} hint="Diarsipkan" icon={MailOpen} />
        <KpiCard label="Surat keluar" value={nOut} hint="Diarsipkan" icon={Send} />
      </div>

      <FilterBar q={q} placeholder="Cari perihal, pengirim, tujuan, atau nomor surat" hidden={jenis ? { jenis } : undefined} resetHref="/arsip" active={filtered}>
        <div><label htmlFor="from" className="sr-only">Diarsipkan dari</label><input id="from" name="from" type="date" defaultValue={from} className={inputClass + " w-auto"} title="Diarsipkan dari" /></div>
        <div><label htmlFor="to" className="sr-only">Diarsipkan sampai</label><input id="to" name="to" type="date" defaultValue={to} className={inputClass + " w-auto"} title="Diarsipkan sampai" /></div>
      </FilterBar>
      <StatusChips basePath="/arsip" param="jenis" params={base} active={jenis} items={chips} />

      {list.error ? <ErrorState message="Arsip tidak dapat dimuat. Coba lagi." /> : !rows.length ? (
        <div className="rounded-xl border border-line bg-surface-card shadow-card">
          <EmptyState title={filtered ? "Tidak ada arsip yang cocok" : "Belum ada arsip"} description={filtered ? "Ubah atau reset filter pencarian." : "Surat yang selesai diproses lalu diarsipkan akan tersimpan di sini."} />
        </div>
      ) : (
        <>
          <div className="space-y-7">
            {groups.map((g) => (
              <section key={g.label} aria-label={g.label}>
                <h2 className="mb-3 flex items-center gap-3 text-sm font-semibold capitalize text-ink-soft">{g.label}<span className="h-px flex-1 bg-line" aria-hidden /><span className="text-xs font-medium tabular-nums text-ink-mute">{g.rows.length} surat</span></h2>
                <ul className="overflow-hidden rounded-xl border border-line bg-surface-card shadow-card divide-y divide-line">
                  {g.rows.map((r) => {
                    const inc = r.incoming as Row | null; const out = r.outgoing as Row | null;
                    const conf = !!(inc?.is_confidential || out?.is_confidential);
                    const Icon = conf ? Lock : inc ? MailOpen : Send;
                    const href = inc ? `/surat-masuk/${inc.id}` : `/surat-keluar/${out?.id}`;
                    const number = (inc?.external_number ?? out?.number) as string | null;
                    return (
                      <li key={r.id as string} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${conf ? "bg-bad-bg text-bad" : "bg-navy-50 text-navy-700"}`} aria-hidden><Icon className="h-5 w-5" /></span>
                        <div className="min-w-0 flex-1 basis-64">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-surface px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-soft">{inc ? "Masuk" : "Keluar"}</span>
                            <Link href={href} className="truncate text-[15px] font-medium text-ink hover:text-navy-800 hover:underline">{inc?.subject ?? out?.subject}</Link>
                          </div>
                          <p className="mt-0.5 truncate text-sm text-ink-soft">{inc ? `${inc.sender}${inc.origin_org ? " - " + inc.origin_org : ""}` : `Kepada ${out?.recipient}`}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-ink-mute">
                            {number && <span className="inline-flex items-center gap-1 tabular-nums"><Hash className="h-3.5 w-3.5" aria-hidden />{number}</span>}
                            <span className="inline-flex items-center gap-1 tabular-nums"><CalendarCheck className="h-3.5 w-3.5" aria-hidden />Diarsipkan {formatDate(r.archived_at as string)}</span>
                            <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" aria-hidden />{names[r.archived_by as string] ?? "-"}</span>
                            {r.retention_note && <span className="italic">{r.retention_note as string}</span>}
                          </p>
                        </div>
                        {(canManage || canDelete) && (
                          <form action={unarchiveLetter} className="flex flex-wrap gap-2">
                            <input type="hidden" name="kind" value={inc ? "incoming" : "outgoing"} /><input type="hidden" name="id" value={(inc ? inc.id : out?.id) as string} />
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
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
          <Pagination page={page} total={list.count ?? 0} pageSize={PAGE_SIZE} basePath="/arsip" params={params} />
        </>
      )}
    </div>
  );
}