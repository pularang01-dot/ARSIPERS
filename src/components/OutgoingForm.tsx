import { Field, inputClass, SubmitButton, LinkButton } from "@/components/ui";
import { NATURES, STATUS_LABEL } from "@/lib/constants";
import { UnsavedGuard } from "@/components/UnsavedGuard";

type Opt = { id: string; name: string };
type Values = Partial<{ id: string; recipient: string; subject: string; body: string; letter_date: string; letter_type: string; category_id: string | null; template_id: string | null; attachment_note: string | null; nature: string }>;

export function OutgoingForm({ action, categories, templates, values, cancelHref, isNew }: { action: (f: FormData) => Promise<void>; categories: Opt[]; templates: Opt[]; values?: Values; cancelHref: string; isNew?: boolean }) {
  const v = values ?? {};
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form id="outgoing-form" action={action} encType="multipart/form-data" className="space-y-8">
      <UnsavedGuard formId="outgoing-form" />
      {v.id && <input type="hidden" name="id" value={v.id} />}
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-navy-900">Metadata surat</legend>
        <Field label="Tujuan surat" htmlFor="recipient" required><input id="recipient" name="recipient" required defaultValue={v.recipient ?? ""} className={inputClass} maxLength={300} /></Field>
        <Field label="Tanggal surat" htmlFor="letter_date" required hint="Tanggal ini menentukan periode penomoran."><input id="letter_date" name="letter_date" type="date" required defaultValue={v.letter_date ?? today} className={inputClass} /></Field>
        <div className="sm:col-span-2"><Field label="Perihal" htmlFor="subject" required><input id="subject" name="subject" required defaultValue={v.subject ?? ""} className={inputClass} maxLength={300} /></Field></div>
        <Field label="Jenis surat" htmlFor="letter_type" required><input id="letter_type" name="letter_type" required defaultValue={v.letter_type ?? "UMUM"} className={inputClass} maxLength={50} /></Field>
        <Field label="Kategori" htmlFor="category_id" hint="Kode kategori dapat dipakai pada format nomor ({CODE}).">
          <select id="category_id" name="category_id" defaultValue={v.category_id ?? ""} className={inputClass}><option value="">Tanpa kategori</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </Field>
        <Field label="Sifat surat" htmlFor="nature" required><select id="nature" name="nature" defaultValue={v.nature ?? "BIASA"} className={inputClass}>{NATURES.map((n) => <option key={n} value={n}>{STATUS_LABEL[n]}</option>)}</select></Field>
        <Field label="Keterangan lampiran" htmlFor="attachment_note"><input id="attachment_note" name="attachment_note" defaultValue={v.attachment_note ?? ""} className={inputClass} maxLength={300} placeholder="mis. 1 berkas" /></Field>
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="mb-3 text-sm font-semibold text-navy-900">Isi surat</legend>
        {isNew && (
          <Field label="Template" htmlFor="template_id" hint="Jika isi dikosongkan, isi surat dibuat dari template terpilih.">
            <select id="template_id" name="template_id" defaultValue={v.template_id ?? ""} className={inputClass}><option value="">Tanpa template</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          </Field>
        )}
        <Field label="Isi" htmlFor="body"><textarea id="body" name="body" rows={14} defaultValue={v.body ?? ""} className={inputClass + " font-sans leading-relaxed"} maxLength={20000} /></Field>
        {isNew && <Field label="Lampiran (PDF, JPG, atau PNG)" htmlFor="file"><input id="file" name="file" type="file" accept="application/pdf,image/jpeg,image/png" className={inputClass} /></Field>}
      </fieldset>
      <div className="flex gap-2 border-t border-line pt-5"><SubmitButton>Simpan draft</SubmitButton><LinkButton href={cancelHref} variant="secondary">Batal</LinkButton></div>
    </form>
  );
}
