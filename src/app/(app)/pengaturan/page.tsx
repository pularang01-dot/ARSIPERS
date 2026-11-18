import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, Field, Flash, inputClass, PageHeader, StatusBadge, SubmitButton } from "@/components/ui";
import { firstParam } from "@/lib/utils";
import { addCategory, saveSettings, saveTemplate, toggleCategory } from "@/features/admin-actions";
import { previewNumber } from "@/lib/numbering";
import { TEMPLATE_PLACEHOLDERS } from "@/lib/templates";

export const metadata = { title: "Pengaturan" };

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await requirePermission("settings.manage");
  const sb = createClient();
  const [{ data: st }, { data: cats }, { data: tpls }] = await Promise.all([
    sb.from("school_settings").select("*").eq("id", 1).maybeSingle(),
    sb.from("letter_categories").select("id, kind, code, name, is_active").order("kind").order("name"),
    sb.from("letter_templates").select("id, name, letter_type, body, version, is_active").order("name"),
  ]);
  const s = st ?? {};
  const preview = s.number_format ? previewNumber(s.number_format, 1, s.number_seq_pad ?? 3, new Date(), "UMUM") : null;
  return (
    <>
      <PageHeader title="Pengaturan" description="Identitas sekolah dan aturan penomoran. Isi hanya data yang sudah dikonfirmasi pihak sekolah; kolom kosong tidak ditampilkan di PDF." />
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />
      <form action={saveSettings} className="space-y-6">
        <Card title="Identitas sekolah">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama sekolah" htmlFor="name"><input id="name" name="name" defaultValue={s.name ?? ""} className={inputClass} /></Field>
            <Field label="NPSN" htmlFor="npsn"><input id="npsn" name="npsn" defaultValue={s.npsn ?? ""} className={inputClass} /></Field>
            <div className="sm:col-span-2"><Field label="Alamat" htmlFor="address"><input id="address" name="address" defaultValue={s.address ?? ""} className={inputClass} /></Field></div>
            <Field label="Telepon" htmlFor="phone"><input id="phone" name="phone" defaultValue={s.phone ?? ""} className={inputClass} /></Field>
            <Field label="Email sekolah" htmlFor="email"><input id="email" name="email" type="email" defaultValue={s.email ?? ""} className={inputClass} /></Field>
            <Field label="Nama kepala sekolah" htmlFor="principal_name"><input id="principal_name" name="principal_name" defaultValue={s.principal_name ?? ""} className={inputClass} /></Field>
            <Field label="NIP kepala sekolah" htmlFor="principal_nip"><input id="principal_nip" name="principal_nip" defaultValue={s.principal_nip ?? ""} className={inputClass} /></Field>
            <div className="sm:col-span-2"><Field label="Catatan kop surat" htmlFor="letterhead_note"><input id="letterhead_note" name="letterhead_note" defaultValue={s.letterhead_note ?? ""} className={inputClass} /></Field></div>
          </div>
        </Card>
        <Card title="Penomoran surat keluar">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3"><Field label="Format nomor" htmlFor="number_format" hint="Token: {SEQ} {YEAR} {MONTH} {MONTH_ROMAN} {CODE}. Wajib memuat {SEQ}. Format resmi harus dikonfirmasi sekolah; selama kosong, surat tidak dapat difinalkan."><input id="number_format" name="number_format" defaultValue={s.number_format ?? ""} className={inputClass} /></Field></div>
            <Field label="Lebar nomor urut" htmlFor="number_seq_pad"><input id="number_seq_pad" name="number_seq_pad" type="number" min={1} max={8} defaultValue={s.number_seq_pad ?? 3} className={inputClass} /></Field>
            <Field label="Reset nomor urut" htmlFor="number_reset"><select id="number_reset" name="number_reset" defaultValue={s.number_reset ?? "YEARLY"} className={inputClass}><option value="YEARLY">Setiap tahun</option><option value="MONTHLY">Setiap bulan</option><option value="NEVER">Tidak pernah</option></select></Field>
            <div className="self-end text-sm"><p className="text-xs text-ink-mute">Pratinjau</p><p className="tabular-nums">{preview ?? "Belum dikonfigurasi"}</p></div>
          </div>
          <div className="mt-5"><SubmitButton>Simpan pengaturan</SubmitButton></div>
        </Card>
      </form>

      <Card title="Kategori surat" className="mt-6">
        <ul className="mb-5 divide-y divide-line">{(cats ?? []).map((c: any) => (
          <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span>{c.name} <span className="text-xs text-ink-mute">({c.kind === "incoming" ? "masuk" : "keluar"}, kode {c.code})</span></span>
            <form action={toggleCategory} className="flex items-center gap-2"><input type="hidden" name="id" value={c.id} /><input type="hidden" name="active" value={String(!c.is_active)} /><StatusBadge value={c.is_active ? "SELESAI" : "DRAFT"} tone={c.is_active ? "ok" : "idle"} /><SubmitButton variant="ghost" className="px-3 text-xs">{c.is_active ? "Nonaktifkan" : "Aktifkan"}</SubmitButton></form></li>))}
          {!cats?.length && <li className="py-2 text-sm text-ink-mute">Belum ada kategori. Tambahkan sesuai pedoman sekolah.</li>}</ul>
        <form action={addCategory} className="grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
          <Field label="Jenis" htmlFor="kind"><select id="kind" name="kind" className={inputClass}><option value="incoming">Surat masuk</option><option value="outgoing">Surat keluar</option></select></Field>
          <Field label="Kode" htmlFor="code"><input id="code" name="code" required maxLength={20} className={inputClass} /></Field>
          <Field label="Nama kategori" htmlFor="cname"><input id="cname" name="name" required className={inputClass} /></Field>
          <SubmitButton variant="secondary">Tambah</SubmitButton>
        </form>
      </Card>

      <Card title="Template surat" className="mt-6">
        <p className="mb-4 text-xs text-ink-mute">Placeholder: {TEMPLATE_PLACEHOLDERS.map((p) => `{{${p}}}`).join(" ")}. Setiap perubahan isi membuat versi template baru.</p>
        <div className="space-y-5">{(tpls ?? []).map((t: any) => (
          <form key={t.id} action={saveTemplate} className="space-y-3 rounded-md border border-line p-4"><input type="hidden" name="id" value={t.id} />
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr]"><Field label={`Nama (versi ${t.version})`} htmlFor={`tn-${t.id}`}><input id={`tn-${t.id}`} name="name" defaultValue={t.name} className={inputClass} /></Field><Field label="Jenis surat" htmlFor={`tt-${t.id}`}><input id={`tt-${t.id}`} name="letter_type" defaultValue={t.letter_type} className={inputClass} /></Field></div>
            <Field label="Isi template" htmlFor={`tb-${t.id}`}><textarea id={`tb-${t.id}`} name="body" rows={6} defaultValue={t.body} className={inputClass} /></Field>
            <div className="flex items-center gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={t.is_active} className="h-4 w-4" />Aktif</label><SubmitButton variant="secondary">Simpan template</SubmitButton></div></form>))}
          <form action={saveTemplate} className="space-y-3 rounded-md border border-dashed border-line-strong p-4"><h3 className="text-sm font-semibold text-navy-900">Template baru</h3>
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr]"><Field label="Nama" htmlFor="new-name"><input id="new-name" name="name" required className={inputClass} /></Field><Field label="Jenis surat" htmlFor="new-type"><input id="new-type" name="letter_type" defaultValue="UMUM" className={inputClass} /></Field></div>
            <Field label="Isi template" htmlFor="new-body"><textarea id="new-body" name="body" rows={6} required className={inputClass} /></Field>
            <SubmitButton variant="secondary">Tambah template</SubmitButton></form>
        </div>
      </Card>
    </>
  );
}
