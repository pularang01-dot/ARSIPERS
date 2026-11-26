import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, Field, Flash, inputClass, PageHeader, StatusBadge, SubmitButton, LinkButton } from "@/components/ui";
import { firstParam } from "@/lib/utils";
import { addCategory, purgeTestData, saveSettings, setTestMode, toggleCategory } from "@/features/admin-actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { previewNumber } from "@/lib/numbering";
import { NumberFormatField } from "@/components/NumberFormatField";
import { LetterheadEditor } from "@/components/LetterheadEditor";

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
  const [{ count: testIn }, { count: testOut }, { count: sigCount }] = await Promise.all([
    sb.from("incoming_letters").select("id", { count: "exact", head: true }).eq("is_test", true),
    sb.from("outgoing_letters").select("id", { count: "exact", head: true }).eq("is_test", true),
    sb.from("signatories").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
  ]);
  const testTotal = (testIn ?? 0) + (testOut ?? 0);
  const preview = s.number_format ? previewNumber(s.number_format, 1, s.number_seq_pad ?? 3, new Date(), "UMUM") : null;
  return (
    <>
      <PageHeader title="Pengaturan" description="Kop surat, data pejabat, dan aturan penomoran. Isi hanya data yang sudah dikonfirmasi pihak sekolah; kolom kosong tidak dicetak di PDF." />
      <div id="pesan" className="scroll-mt-24"><Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} /></div>
      <form action={saveSettings} encType="multipart/form-data" className="space-y-6">
        <Card title="Kop surat">
          <LetterheadEditor defaults={{
            parent: s.letterhead_parent ?? "", name: s.name ?? "", address: s.address ?? "", phone: s.phone ?? "", email: s.email ?? "", note: s.letterhead_note ?? "",
            rule: (s.letterhead_rule ?? "THICK") as "THICK" | "DOUBLE" | "NONE", city: s.letter_city ?? "",
            logoSrc: s.logo_data && s.logo_mime ? `data:${s.logo_mime};base64,${s.logo_data}` : null,
          }} />
        </Card>
        <Card title="Data sekolah dan pejabat">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="NPSN" htmlFor="npsn" optional><input id="npsn" name="npsn" defaultValue={s.npsn ?? ""} className={inputClass} /></Field>
            <Field label="Nama kepala sekolah" htmlFor="principal_name" hint="Dicetak di bawah tanda tangan."><input id="principal_name" name="principal_name" defaultValue={s.principal_name ?? ""} className={inputClass} /></Field>
            <Field label="NIP kepala sekolah" htmlFor="principal_nip"><input id="principal_nip" name="principal_nip" defaultValue={s.principal_nip ?? ""} className={inputClass} /></Field>
          </div>
        </Card>
        <Card title="Penomoran surat keluar">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3"><Field label="Format nomor" htmlFor="number_format" hint="Format resmi harus dikonfirmasi sekolah. Selama kosong, surat tidak dapat difinalkan."><NumberFormatField defaultValue={s.number_format ?? ""} pad={s.number_seq_pad ?? 3} /></Field></div>
            <Field label="Lebar nomor urut" htmlFor="number_seq_pad"><input id="number_seq_pad" name="number_seq_pad" type="number" min={1} max={8} defaultValue={s.number_seq_pad ?? 3} className={inputClass} /></Field>
            <Field label="Reset nomor urut" htmlFor="number_reset"><select id="number_reset" name="number_reset" defaultValue={s.number_reset ?? "YEARLY"} className={inputClass}><option value="YEARLY">Setiap tahun</option><option value="MONTHLY">Setiap bulan</option><option value="NEVER">Tidak pernah</option></select></Field>
            <div className="self-end text-sm"><p className="text-xs text-ink-mute">Pratinjau</p><p className="tabular-nums">{preview ?? "Belum dikonfigurasi"}</p></div>
          </div>
          <div className="mt-5"><SubmitButton>Simpan pengaturan</SubmitButton></div>
        </Card>
      </form>

      <div id="kategori" className="scroll-mt-24"><Card title="Kategori surat" className="mt-6">
        <ul className="mb-5 divide-y divide-line">{(cats ?? []).map((c: any) => (
          <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span>{c.name} <span className="text-xs text-ink-mute">({c.kind === "incoming" ? "masuk" : "keluar"}, kode {c.code})</span></span>
            <form action={toggleCategory} className="flex items-center gap-2"><input type="hidden" name="id" value={c.id} /><input type="hidden" name="active" value={String(!c.is_active)} /><StatusBadge value={c.is_active ? "SELESAI" : "DRAFT"} tone={c.is_active ? "ok" : "idle"} /><SubmitButton variant="ghost" className="px-3 text-xs">{c.is_active ? "Nonaktifkan" : "Aktifkan"}</SubmitButton></form></li>))}
          {!cats?.length && <li className="py-2 text-sm text-ink-mute">Belum ada kategori. Tambahkan sesuai pedoman sekolah.</li>}</ul>
        <form action={addCategory} className="grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_2fr_1.2fr_auto] sm:items-start">
          <Field label="Jenis" htmlFor="kind"><select id="kind" name="kind" className={inputClass}><option value="incoming">Surat masuk</option><option value="outgoing">Surat keluar</option></select></Field>
          <Field label="Nama kategori" htmlFor="cname" required><input id="cname" name="name" required maxLength={80} placeholder="mis. Surat tugas" className={inputClass} /></Field>
          <Field label="Kode" htmlFor="code" optional hint="Kosongkan agar dibuat otomatis dari nama."><input id="code" name="code" maxLength={20} className={inputClass} /></Field>
          <SubmitButton variant="secondary">Tambah</SubmitButton>
        </form>
      </Card>
      </div>

      <Card title="Template surat" className="mt-6" action={<LinkButton href="/pengaturan/template" variant="secondary">Kelola template</LinkButton>}>
        <p className="text-sm leading-relaxed text-ink-soft">Template adalah kerangka isi surat yang bisa dipilih saat membuat surat keluar, sehingga tujuan, perihal, dan nama sekolah terisi otomatis. {(tpls ?? []).length ? `Saat ini ada ${(tpls ?? []).length} template.` : "Belum ada template."}</p>
      </Card>

      <Card title="Tanda tangan digital" className="mt-6" action={<LinkButton href="/pengaturan/penandatangan" variant="secondary">Kelola penandatangan</LinkButton>}>
        <p className="text-sm leading-relaxed text-ink-soft">Atur pejabat yang berhak menandatangani surat secara digital, lengkap dengan masa jabatannya. Saat jabatan berganti, tanda tangan lama diakhiri dan tidak dapat dipakai lagi tanpa mengubah keabsahan surat yang sudah terbit. {sigCount ? `Penandatangan aktif saat ini: ${sigCount}.` : "Belum ada penandatangan aktif."}</p>
      </Card>

      <div id="uji-coba" className="scroll-mt-24">
        <Card title="Mode uji coba" className="mt-6">
          <p className="text-sm leading-relaxed text-ink-soft">Gunakan untuk berlatih atau mengenalkan aplikasi kepada staf tanpa mengganggu data resmi. Selama mode ini aktif, surat yang dibuat <strong className="text-ink">ditandai &ldquo;Uji coba&rdquo;</strong>, memakai nomor terpisah berawalan <strong className="font-mono text-ink">UJI-</strong> (nomor resmi tidak terpakai), PDF-nya diberi watermark, tidak ikut laporan, dan dapat dihapus sekaligus.</p>
          <form action={setTestMode} className="mt-4 flex flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" name="enabled" defaultChecked={!!s.test_mode} className="peer sr-only" />
              <span className="relative h-7 w-12 rounded-full bg-line-strong transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-brass peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-navy-600" aria-hidden />
              <span className="text-sm font-medium text-ink">Mode uji coba aktif</span>
            </label>
            <SubmitButton variant="secondary">Simpan pilihan</SubmitButton>
          </form>
          <p className="mt-3 text-xs text-ink-mute">Surat yang sudah ada tidak berubah. Hanya surat yang dibuat setelah mode diaktifkan yang ditandai.</p>
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-sm text-ink-soft">Data uji coba tersimpan: <strong className="text-ink">{testIn ?? 0}</strong> surat masuk dan <strong className="text-ink">{testOut ?? 0}</strong> surat keluar.</p>
            {testTotal > 0 && (
              <form action={purgeTestData} className="mt-3">
                <ConfirmButton label="Hapus semua data uji coba" title="Hapus semua data uji coba?" confirmLabel="Hapus data uji coba"
                  message="Semua surat bertanda Uji coba disembunyikan dari seluruh daftar. Surat resmi dan nomor resmi tidak terpengaruh. Tindakan ini tercatat di riwayat aktivitas.">
                  <Field label="Ketik HAPUS untuk konfirmasi" htmlFor="purge-c"><input id="purge-c" name="confirm" autoComplete="off" className={inputClass} /></Field>
                </ConfirmButton>
              </form>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}