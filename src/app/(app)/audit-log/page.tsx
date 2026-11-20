import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getProfileMap } from "@/lib/data";
import { EmptyState, ErrorState, Field, inputClass, PageHeader, Pagination, SubmitButton, buttonClass } from "@/components/ui";
import { Avatar, StatusChips } from "@/components/letters";
import { categoryOf, CATEGORIES, describeAudit, type AuditEntity } from "@/lib/audit-text";
import { firstParam, todayJakarta } from "@/lib/utils";
import { X } from "lucide-react";

export const metadata = { title: "Riwayat aktivitas" };
type Row = Record<string, any>;
const SIZE = 25;
const UUID = /^[0-9a-f-]{36}$/i;

const shiftDay = (d: string, delta: number) => new Date(new Date(d + "T00:00:00Z").getTime() + delta * 86400000).toISOString().slice(0, 10);
const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const timeOf = (iso: string) => new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date(iso)).replace(".", ":");

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await requirePermission("audit_logs.view");
  const sb = createClient();
  const kategori = CATEGORIES.some((c) => c.value === firstParam(searchParams.kategori)) ? firstParam(searchParams.kategori) : "";
  const siapa = UUID.test(firstParam(searchParams.siapa)) ? firstParam(searchParams.siapa) : "";
  const re = /^\d{4}-\d{2}-\d{2}$/;
  const from = re.test(firstParam(searchParams.from)) ? firstParam(searchParams.from) : "";
  const to = re.test(firstParam(searchParams.to)) ? firstParam(searchParams.to) : "";
  const page = Math.max(1, parseInt(firstParam(searchParams.page) || "1", 10) || 1);

  let query = sb.from("audit_logs").select("id, actor_id, action, entity_type, entity_id, metadata, created_at", { count: "exact" });
  if (kategori) query = query.in("action", CATEGORIES.find((c) => c.value === kategori)!.actions);
  if (siapa) query = query.eq("actor_id", siapa);
  if (from) query = query.gte("created_at", `${from}T00:00:00+07:00`);
  if (to) query = query.lte("created_at", `${to}T23:59:59+07:00`);
  const { data, count, error } = await query.order("created_at", { ascending: false }).range((page - 1) * SIZE, page * SIZE - 1);
  const rows = (data ?? []) as Row[];

  // Ambil nama surat/pengguna/berkas yang dimaksud, supaya kalimat menyebut perihalnya, bukan kode.
  const idsOf = (type: string) => Array.from(new Set(rows.filter((r) => r.entity_type === type && UUID.test(String(r.entity_id))).map((r) => String(r.entity_id))));
  const [inc, out, disp, att, people, profs] = await Promise.all([
    idsOf("incoming_letter").length ? sb.from("incoming_letters").select("id, subject, is_confidential").in("id", idsOf("incoming_letter")) : { data: [] as Row[] },
    idsOf("outgoing_letter").length ? sb.from("outgoing_letters").select("id, subject, is_confidential").in("id", idsOf("outgoing_letter")) : { data: [] as Row[] },
    idsOf("disposition").length ? sb.from("letter_dispositions").select("id, incoming:incoming_letters(id, subject, is_confidential)").in("id", idsOf("disposition")) : { data: [] as Row[] },
    idsOf("attachment").length ? sb.from("letter_attachments").select("id, file_name").in("id", idsOf("attachment")) : { data: [] as Row[] },
    idsOf("profile").length ? sb.from("profiles").select("id, full_name").in("id", idsOf("profile")) : { data: [] as Row[] },
    sb.from("profiles").select("id, full_name").order("full_name").limit(200),
  ]);
  const byId = (d: unknown) => new Map(((d ?? []) as Row[]).map((r) => [String(r.id), r]));
  const mInc = byId(inc.data), mOut = byId(out.data), mDisp = byId(disp.data), mAtt = byId(att.data), mPeople = byId(people.data);
  const names = await getProfileMap(sb, rows.map((r) => r.actor_id as string));

  const entityFor = (r: Row): AuditEntity => {
    const id = String(r.entity_id);
    switch (r.entity_type) {
      case "incoming_letter": { const l = mInc.get(id); return { kind: "incoming", found: !!l, label: l?.subject, confidential: !!l?.is_confidential, href: l ? `/surat-masuk/${id}` : undefined }; }
      case "outgoing_letter": { const l = mOut.get(id); return { kind: "outgoing", found: !!l, label: l?.subject, confidential: !!l?.is_confidential, href: l ? `/surat-keluar/${id}` : undefined }; }
      case "disposition": { const d = mDisp.get(id); const l = d?.incoming as Row | null | undefined; return { kind: "disposition", found: !!l, label: l?.subject, confidential: !!l?.is_confidential, href: d ? `/disposisi/${id}` : undefined }; }
      case "attachment": { const a = mAtt.get(id); return { kind: "attachment", found: !!a, label: a?.file_name }; }
      case "profile": { const p = mPeople.get(id); return { kind: "profile", found: !!p, label: p?.full_name }; }
      default: return { kind: "none", found: true };
    }
  };

  // Kelompokkan per hari
  const today = todayJakarta(), yesterday = shiftDay(today, -1);
  const dayLabel = (k: string) => k === today ? "Hari ini" : k === yesterday ? "Kemarin" : new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(k + "T00:00:00Z"));
  const groups: { key: string; rows: Row[] }[] = [];
  rows.forEach((r) => { const k = dayKey(r.created_at as string); const g = groups.find((x) => x.key === k); if (g) g.rows.push(r); else groups.push({ key: k, rows: [r] }); });

  const filtered = !!(kategori || siapa || from || to);
  const base: Record<string, string> = {};
  if (siapa) base.siapa = siapa; if (from) base.from = from; if (to) base.to = to;
  const params = kategori ? { ...base, kategori } : base;
  const chips = [{ value: "", label: "Semua" }, ...CATEGORIES.map((c) => ({ value: c.value, label: c.label }))];

  return (
    <div className="space-y-5">
      <PageHeader title="Riwayat aktivitas" description="Catatan siapa melakukan apa dan kapan di ARSIPERS. Catatan ini otomatis dan tidak dapat diubah atau dihapus dari dalam aplikasi." />

      <StatusChips basePath="/audit-log" param="kategori" params={base} active={kategori} items={chips} />

      <form className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface-card p-4 shadow-card" role="search" aria-label="Saring riwayat">
        {kategori && <input type="hidden" name="kategori" value={kategori} />}
        <Field label="Pelaku" htmlFor="siapa"><select id="siapa" name="siapa" defaultValue={siapa} className={inputClass + " w-auto min-w-[12rem]"}><option value="">Semua orang</option>{((profs.data ?? []) as Row[]).map((p) => <option key={p.id as string} value={p.id as string}>{(p.full_name as string) || "Tanpa nama"}</option>)}</select></Field>
        <Field label="Dari tanggal" htmlFor="from"><input id="from" name="from" type="date" defaultValue={from} className={inputClass + " w-auto"} /></Field>
        <Field label="Sampai tanggal" htmlFor="to"><input id="to" name="to" type="date" defaultValue={to} className={inputClass + " w-auto"} /></Field>
        <SubmitButton variant="secondary">Terapkan</SubmitButton>
        {filtered && <Link href="/audit-log" className={buttonClass("ghost", "gap-1.5")}><X className="h-4 w-4" aria-hidden />Reset</Link>}
      </form>

      {error ? <ErrorState message="Riwayat tidak dapat dimuat. Coba lagi." /> : !rows.length ? (
        <div className="rounded-xl border border-line bg-surface-card shadow-card"><EmptyState title={filtered ? "Tidak ada aktivitas yang cocok" : "Belum ada aktivitas"} description={filtered ? "Ubah atau reset penyaring di atas." : "Aktivitas pengguna akan tercatat di sini secara otomatis."} /></div>
      ) : (
        <>
          <div className="space-y-7">
            {groups.map((g) => (
              <section key={g.key} aria-label={dayLabel(g.key)}>
                <h2 className="mb-3 flex items-center gap-3 text-sm font-semibold capitalize text-ink-soft">{dayLabel(g.key)}<span className="h-px flex-1 bg-line" aria-hidden /></h2>
                <ul className="overflow-hidden rounded-xl border border-line bg-surface-card shadow-card divide-y divide-line">
                  {g.rows.map((r) => {
                    const actor = r.actor_id ? names[r.actor_id as string] ?? "Seorang pengguna" : "Sistem";
                    const s = describeAudit(r.action as string, (r.metadata ?? {}) as Record<string, unknown>, entityFor(r));
                    // Tambahan berawalan huruf kecil melanjutkan kalimat; berawalan huruf besar menjadi kalimat baru.
                    const cont = !!s.extra && s.extra[0] === s.extra[0].toLowerCase();
                    const tail = s.extra ? (cont ? ` ${s.extra}` : `. ${s.extra}`) : ".";
                    return (
                      <li key={r.id as number} className="flex gap-4 px-5 py-4">
                        <Avatar name={actor} size={38} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] leading-relaxed text-ink">
                            <strong className="font-semibold">{actor}</strong> {s.verb}
                            {s.object && <> {s.object.href ? <Link href={s.object.href} className="font-medium text-navy-800 hover:underline">{s.object.text}</Link> : <span className="font-medium">{s.object.text}</span>}</>}
                            {tail}
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-mute">
                            <span className="tabular-nums">Pukul {timeOf(r.created_at as string)} WIB</span>
                            <span className="rounded bg-surface px-1.5 py-0.5 font-medium text-ink-soft">{categoryOf(r.action as string)}</span>
                          </p>
                          <details className="mt-1.5 text-xs text-ink-mute">
                            <summary className="cursor-pointer select-none hover:text-ink">Rincian teknis</summary>
                            <p className="mt-1 break-all">Kode tindakan: {r.action as string} - Objek: {r.entity_type as string} {String(r.entity_id ?? "")}</p>
                            {Object.keys((r.metadata ?? {}) as object).length > 0 && <p className="mt-0.5 break-all">Data: {JSON.stringify(r.metadata)}</p>}
                          </details>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
          <Pagination page={page} total={count ?? 0} pageSize={SIZE} basePath="/audit-log" params={params} />
        </>
      )}
    </div>
  );
}