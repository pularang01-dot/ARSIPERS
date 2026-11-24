"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { buttonClass, Field, inputClass, SubmitButton } from "@/components/ui";
import { countFillIns, renderTemplate, TEMPLATE_FIELDS, unknownPlaceholders } from "@/lib/templates";
import { TEMPLATE_STARTERS } from "@/lib/template-starters";
import { cn } from "@/lib/utils";

type School = { name?: string | null; principal_name?: string | null; principal_nip?: string | null };

/** Penyunting template: tombol sisip, contoh siap pakai, dan pratinjau langsung memakai data contoh. */
export function TemplateEditor({ action, school, values, cancelHref }: {
  action: (f: FormData) => Promise<void>; school: School; cancelHref: string;
  values?: { id?: string; name: string; letter_type: string; body: string; is_active?: boolean; version?: number };
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [name, setName] = useState(values?.name ?? "");
  const [type, setType] = useState(values?.letter_type ?? "UMUM");
  const [body, setBody] = useState(values?.body ?? "");
  const unknown = useMemo(() => unknownPlaceholders(body), [body]);
  const fillIns = useMemo(() => countFillIns(body), [body]);
  const sample = {
    recipient: "Kepala Dinas Pendidikan", subject: "Undangan Rapat Dewan Guru",
    date: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date()),
    school_name: school.name || "(nama sekolah belum diisi di Pengaturan)", principal_name: school.principal_name || "(nama kepala sekolah)", principal_nip: school.principal_nip || "(NIP)",
  };
  const preview = useMemo(() => renderTemplate(body, sample), [body]); // eslint-disable-line react-hooks/exhaustive-deps

  const insert = (token: string) => {
    const el = ref.current; if (!el) return;
    const a = el.selectionStart ?? body.length, b = el.selectionEnd ?? body.length;
    setBody(body.slice(0, a) + token + body.slice(b));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + token.length, a + token.length); });
  };
  const applyStarter = (id: string) => {
    const s = TEMPLATE_STARTERS.find((x) => x.id === id); if (!s) return;
    if (body.trim() && !window.confirm("Isi template saat ini akan diganti dengan contoh. Lanjutkan?")) return;
    setBody(s.body); if (!name.trim()) setName(s.name); if (type === "UMUM") setType(s.type);
  };

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-2">
      {values?.id && <input type="hidden" name="id" value={values.id} />}
      <div className="space-y-5">
        {!values?.id && (
          <div className="rounded-xl border border-brass/40 bg-brass-soft p-4">
            <p className="text-sm font-semibold text-navy-900">Mulai dari contoh</p>
            <p className="mt-0.5 text-xs text-ink-soft">Pilih salah satu, lalu ubah sesuai gaya surat sekolah Anda.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {TEMPLATE_STARTERS.map((s) => <button key={s.id} type="button" onClick={() => applyStarter(s.id)} className={buttonClass("secondary", "min-h-[36px] px-3 text-xs")}>{s.name}</button>)}
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="Nama template" htmlFor="tname" required><input id="tname" name="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} className={inputClass} placeholder="mis. Surat undangan rapat" /></Field>
          <Field label="Jenis surat" htmlFor="ttype" required><input id="ttype" name="letter_type" value={type} onChange={(e) => setType(e.target.value)} required maxLength={50} className={inputClass} /></Field>
        </div>

        <div>
          <label htmlFor="tbody" className="mb-1.5 block text-sm font-medium text-ink">Isi surat <span className="text-bad" aria-hidden>*</span></label>
          <div className="mb-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Sisipkan isian otomatis">
            <span className="mr-1 text-xs text-ink-mute">Sisipkan:</span>
            {TEMPLATE_FIELDS.map((f) => <button key={f.key} type="button" onClick={() => insert(`{{${f.key}}}`)} className="rounded-md border border-line-strong bg-white px-2.5 py-1 text-xs text-navy-800 hover:border-navy-600 hover:bg-navy-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600">{f.label}</button>)}
          </div>
          <textarea id="tbody" ref={ref} name="body" value={body} onChange={(e) => setBody(e.target.value)} required rows={18} className={cn(inputClass, "font-display text-[15px] leading-7")} placeholder="Tulis isi surat di sini, atau pilih contoh di atas." />
          <p className="mt-1.5 text-xs text-ink-mute">Bagian seperti <strong>{"{{perihal}}"}</strong> akan terisi otomatis saat surat dibuat. Tulis <strong>[isi ...]</strong> untuk bagian yang diisi manual. Tanggal, &ldquo;Yth.&rdquo;, perihal, dan tanda tangan kepala sekolah sudah otomatis ada di PDF.</p>
          {unknown.length > 0 && <p role="alert" className="mt-2 rounded-md bg-bad-bg px-3 py-2 text-xs text-bad">Isian tidak dikenal: {unknown.map((u) => `{{${u}}}`).join(", ")}. Gunakan tombol Sisipkan di atas.</p>}
        </div>

        {values?.id && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={values.is_active !== false} className="h-4 w-4" />Template aktif (muncul saat membuat surat keluar)</label>
        )}
        <div className="flex gap-2 border-t border-line pt-4"><SubmitButton>Simpan template</SubmitButton><Link href={cancelHref} className={buttonClass("secondary")}>Batal</Link></div>
        {values?.version ? <p className="text-xs text-ink-mute">Versi saat ini: {values.version}. Setiap perubahan isi menyimpan versi baru.</p> : null}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Pratinjau">
        <p className="mb-2 flex items-center justify-between text-sm font-semibold text-navy-900">Pratinjau <span className="text-xs font-normal text-ink-mute">memakai data contoh</span></p>
        <div className="rounded-xl border border-line bg-surface p-4">
          <article className="mx-auto max-w-[560px] rounded-sm border border-line bg-white px-7 py-8 font-display text-[14.5px] leading-7 text-ink shadow-lift">
            <p className="mb-4 text-xs text-ink-mute">Yth. {sample.recipient}</p>
            <div className="whitespace-pre-wrap">{preview.trim() ? preview : <span className="text-ink-mute">Pratinjau akan tampil saat Anda mulai menulis.</span>}</div>
          </article>
        </div>
        {fillIns > 0 && <p className="mt-2 text-xs text-brass-dark">Ada {fillIns} bagian [isi ...] yang perlu dilengkapi saat surat dibuat.</p>}
      </aside>
    </form>
  );
}