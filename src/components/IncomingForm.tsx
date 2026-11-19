import { Field, inputClass, SubmitButton, LinkButton } from "@/components/ui";
import { NATURES, NATURE_HINT, STATUS_LABEL } from "@/lib/constants";
import { UnsavedGuard } from "@/components/UnsavedGuard";
import { ChipRadio, FormActions, FormSection } from "@/components/letters";
import { FileInput } from "@/components/FileInput";
import { todayJakarta } from "@/lib/utils";

type Cat = { id: string; code: string; name: string };
type Values = Partial<{ id: string; external_number: string | null; letter_date: string; received_date: string; sender: string; origin_org: string | null; subject: string; category_id: string | null; classification: string | null; nature: string; summary: string | null; needs_disposition: boolean }>;

export function IncomingForm({ action, categories, values, cancelHref, withFile }: { action: (f: FormData) => Promise<void>; categories: Cat[]; values?: Values; cancelHref: string; withFile?: boolean }) {
  const today = todayJakarta();
  const v = values ?? {};
  return (
    <form id="incoming-form" action={action} encType="multipart/form-data">
      <UnsavedGuard formId="incoming-form" />
      {v.id && <input type="hidden" name="id" value={v.id} />}

      <FormSection step={1} title="Identitas surat" description="Data pokok seperti yang tertera pada surat.">
        <div className="sm:col-span-2"><Field label="Perihal" htmlFor="subject" required><input id="subject" name="subject" required defaultValue={v.subject ?? ""} className={inputClass} maxLength={300} placeholder="Pokok isi surat" /></Field></div>
        <Field label="Nomor surat pengirim" htmlFor="external_number" optional><input id="external_number" name="external_number" defaultValue={v.external_number ?? ""} className={inputClass} maxLength={100} /></Field>
        <Field label="Kategori" htmlFor="category_id" optional>
          <select id="category_id" name="category_id" defaultValue={v.category_id ?? ""} className={inputClass}><option value="">Tanpa kategori</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </Field>
        <Field label="Tanggal surat" htmlFor="letter_date" required><input id="letter_date" name="letter_date" type="date" required defaultValue={v.letter_date ?? today} className={inputClass} /></Field>
        <Field label="Tanggal diterima" htmlFor="received_date" required hint="Tidak boleh sebelum tanggal surat."><input id="received_date" name="received_date" type="date" required defaultValue={v.received_date ?? today} className={inputClass} /></Field>
      </FormSection>

      <FormSection step={2} title="Pengirim" description="Siapa yang mengirim surat ini.">
        <Field label="Nama pengirim" htmlFor="sender" required><input id="sender" name="sender" required defaultValue={v.sender ?? ""} className={inputClass} maxLength={200} /></Field>
        <Field label="Instansi asal" htmlFor="origin_org" optional><input id="origin_org" name="origin_org" defaultValue={v.origin_org ?? ""} className={inputClass} maxLength={200} /></Field>
      </FormSection>

      <FormSection step={3} title="Sifat dan isi" description="Sifat surat menentukan siapa yang dapat melihatnya. Surat rahasia hanya terlihat oleh pihak berwenang.">
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium text-ink">Sifat surat <span className="text-bad" aria-hidden>*</span></p>
          <ChipRadio name="nature" defaultValue={v.nature ?? "BIASA"} options={NATURES.map((n) => ({ value: n, label: STATUS_LABEL[n], hint: NATURE_HINT[n] }))} />
        </div>
        <div className="sm:col-span-2"><Field label="Ringkasan isi" htmlFor="summary" optional><textarea id="summary" name="summary" rows={4} defaultValue={v.summary ?? ""} className={inputClass} maxLength={2000} placeholder="Ringkasan singkat isi surat (opsional)" /></Field></div>
        <label className="flex items-start gap-3 rounded-lg border border-line-strong bg-white p-4 text-sm sm:col-span-2">
          <input type="checkbox" name="needs_disposition" defaultChecked={v.needs_disposition} className="mt-0.5 h-4 w-4" />
          <span><span className="font-medium text-ink">Perlu disposisi kepala sekolah</span><span className="mt-0.5 block text-xs text-ink-mute">Penanda agar surat ini diprioritaskan untuk didisposisikan.</span></span>
        </label>
      </FormSection>

      {withFile && (
        <FormSection step={4} title="Lampiran" description="Pindaian atau foto surat. Disimpan privat dan hanya dapat diunduh pihak berwenang.">
          <div className="sm:col-span-2"><Field label="Berkas surat" htmlFor="file"><FileInput id="file" hint="PDF, JPG, atau PNG" /></Field></div>
        </FormSection>
      )}

      <FormActions><LinkButton href={cancelHref} variant="secondary">Batal</LinkButton><SubmitButton>Simpan surat</SubmitButton></FormActions>
    </form>
  );
}