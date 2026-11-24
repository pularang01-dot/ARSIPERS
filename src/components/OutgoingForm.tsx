import Link from "next/link";
import { Field, inputClass, SubmitButton, LinkButton } from "@/components/ui";
import { NATURES, NATURE_HINT, STATUS_LABEL } from "@/lib/constants";
import { UnsavedGuard } from "@/components/UnsavedGuard";
import { ChipRadio, FormActions, FormSection } from "@/components/letters";
import { FileInput } from "@/components/FileInput";
import { LetterBodyField } from "@/components/LetterBodyField";
import { todayJakarta } from "@/lib/utils";

type Opt = { id: string; name: string };
type Tpl = { id: string; name: string; body: string };
type School = { name?: string | null; principal_name?: string | null; principal_nip?: string | null };
type Values = Partial<{ id: string; recipient: string; subject: string; body: string; letter_date: string; letter_type: string; category_id: string | null; template_id: string | null; attachment_note: string | null; nature: string }>;

export function OutgoingForm({ action, categories, templates, values, cancelHref, isNew, manageCategoriesHref, school }: { action: (f: FormData) => Promise<void>; categories: Opt[]; templates: Tpl[]; school?: School; values?: Values; cancelHref: string; isNew?: boolean; manageCategoriesHref?: string }) {
  const v = values ?? {};
  return (
    <form id="outgoing-form" action={action} encType="multipart/form-data">
      <UnsavedGuard formId="outgoing-form" />
      {v.id && <input type="hidden" name="id" value={v.id} />}

      <FormSection step={1} title="Tujuan dan perihal" description="Kepada siapa surat ditujukan dan apa pokok suratnya.">
        <div className="sm:col-span-2"><Field label="Tujuan surat" htmlFor="recipient" required><input id="recipient" name="recipient" required defaultValue={v.recipient ?? ""} className={inputClass} maxLength={300} placeholder="mis. Kepala Dinas Pendidikan" /></Field></div>
        <div className="sm:col-span-2"><Field label="Perihal" htmlFor="subject" required><input id="subject" name="subject" required defaultValue={v.subject ?? ""} className={inputClass} maxLength={300} /></Field></div>
        <Field label="Tanggal surat" htmlFor="letter_date" required hint="Menentukan periode penomoran."><input id="letter_date" name="letter_date" type="date" required defaultValue={v.letter_date ?? todayJakarta()} className={inputClass} /></Field>
        <Field label="Keterangan lampiran" htmlFor="attachment_note" optional><input id="attachment_note" name="attachment_note" defaultValue={v.attachment_note ?? ""} className={inputClass} maxLength={300} placeholder="mis. 1 berkas" /></Field>
      </FormSection>

      <FormSection step={2} title="Klasifikasi" description="Kode kategori dapat dipakai pada format nomor surat.">
        <Field label="Jenis surat" htmlFor="letter_type" required><input id="letter_type" name="letter_type" required defaultValue={v.letter_type ?? "UMUM"} className={inputClass} maxLength={50} /></Field>
        <Field label="Kategori" htmlFor="category_id" optional><select id="category_id" name="category_id" defaultValue={v.category_id ?? ""} className={inputClass}><option value="">Tanpa kategori</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          {manageCategoriesHref && <p className="mt-1.5 text-xs"><Link href={manageCategoriesHref} className="text-navy-700 underline underline-offset-2">Kategori yang dicari belum ada? Tambahkan di Pengaturan</Link></p>}</Field>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium text-ink">Sifat surat <span className="text-bad" aria-hidden>*</span></p>
          <ChipRadio name="nature" defaultValue={v.nature ?? "BIASA"} options={NATURES.map((n) => ({ value: n, label: STATUS_LABEL[n], hint: NATURE_HINT[n] }))} />
        </div>
      </FormSection>

      <FormSection step={3} title="Isi surat" description="Pilih template agar isi terisi otomatis, atau tulis sendiri. Tanggal, Yth., perihal, dan tanda tangan sudah otomatis ada di PDF.">
        <LetterBodyField templates={templates} school={school ?? {}} defaultBody={v.body ?? ""} defaultTemplateId={v.template_id} showPicker={!!isNew} />
      </FormSection>

      {isNew && (
        <FormSection step={4} title="Lampiran" description="Berkas pendukung yang dikirim bersama surat.">
          <div className="sm:col-span-2"><Field label="Berkas lampiran" htmlFor="file"><FileInput id="file" hint="PDF, JPG, atau PNG" /></Field></div>
        </FormSection>
      )}

      <FormActions><LinkButton href={cancelHref} variant="secondary">Batal</LinkButton><SubmitButton>Simpan draft</SubmitButton></FormActions>
    </form>
  );
}