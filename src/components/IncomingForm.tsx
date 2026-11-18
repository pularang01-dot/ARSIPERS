import { Field, inputClass, SubmitButton, LinkButton } from "@/components/ui";
import { NATURES, STATUS_LABEL } from "@/lib/constants";
import { UnsavedGuard } from "@/components/UnsavedGuard";

type Cat = { id: string; code: string; name: string };
type Values = Partial<{ id: string; external_number: string | null; letter_date: string; received_date: string; sender: string; origin_org: string | null; subject: string; category_id: string | null; classification: string | null; nature: string; summary: string | null; needs_disposition: boolean }>;

export function IncomingForm({ action, categories, values, cancelHref, withFile }: { action: (f: FormData) => Promise<void>; categories: Cat[]; values?: Values; cancelHref: string; withFile?: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const v = values ?? {};
  return (
    <form id="incoming-form" action={action} encType="multipart/form-data" className="space-y-8">
      <UnsavedGuard formId="incoming-form" />
      {v.id && <input type="hidden" name="id" value={v.id} />}
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-navy-900">Identitas surat</legend>
        <Field label="Nomor surat (dari pengirim)" htmlFor="external_number"><input id="external_number" name="external_number" defaultValue={v.external_number ?? ""} className={inputClass} maxLength={100} /></Field>
        <Field label="Sifat surat" htmlFor="nature" required hint="Surat rahasia hanya terlihat oleh pihak yang berwenang.">
          <select id="nature" name="nature" defaultValue={v.nature ?? "BIASA"} className={inputClass}>{NATURES.map((n) => <option key={n} value={n}>{STATUS_LABEL[n]}</option>)}</select>
        </Field>
        <Field label="Tanggal surat" htmlFor="letter_date" required><input id="letter_date" name="letter_date" type="date" required defaultValue={v.letter_date ?? today} className={inputClass} /></Field>
        <Field label="Tanggal diterima" htmlFor="received_date" required><input id="received_date" name="received_date" type="date" required defaultValue={v.received_date ?? today} className={inputClass} /></Field>
        <Field label="Pengirim" htmlFor="sender" required><input id="sender" name="sender" required defaultValue={v.sender ?? ""} className={inputClass} maxLength={200} /></Field>
        <Field label="Instansi asal" htmlFor="origin_org"><input id="origin_org" name="origin_org" defaultValue={v.origin_org ?? ""} className={inputClass} maxLength={200} /></Field>
        <div className="sm:col-span-2"><Field label="Perihal" htmlFor="subject" required><input id="subject" name="subject" required defaultValue={v.subject ?? ""} className={inputClass} maxLength={300} /></Field></div>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-navy-900">Klasifikasi dan isi</legend>
        <Field label="Kategori" htmlFor="category_id">
          <select id="category_id" name="category_id" defaultValue={v.category_id ?? ""} className={inputClass}>
            <option value="">Tanpa kategori</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Klasifikasi arsip" htmlFor="classification" hint="Isi sesuai pedoman klasifikasi sekolah."><input id="classification" name="classification" defaultValue={v.classification ?? ""} className={inputClass} maxLength={100} /></Field>
        <div className="sm:col-span-2"><Field label="Ringkasan isi" htmlFor="summary"><textarea id="summary" name="summary" rows={4} defaultValue={v.summary ?? ""} className={inputClass} maxLength={2000} /></Field></div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="needs_disposition" defaultChecked={v.needs_disposition} className="h-4 w-4" /> Surat ini perlu disposisi kepala sekolah</label>
      </fieldset>
      {withFile && (
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-navy-900">Lampiran</legend>
          <Field label="Berkas surat (PDF, JPG, atau PNG)" htmlFor="file" hint="Disimpan privat. Ukuran maksimal sesuai pengaturan server."><input id="file" name="file" type="file" accept="application/pdf,image/jpeg,image/png" className={inputClass} /></Field>
        </fieldset>
      )}
      <div className="flex gap-2 border-t border-line pt-5"><SubmitButton>Simpan surat</SubmitButton><LinkButton href={cancelHref} variant="secondary">Batal</LinkButton></div>
    </form>
  );
}
