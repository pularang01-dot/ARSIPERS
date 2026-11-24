"use client";
import { useMemo, useRef, useState } from "react";
import { normalizeNumberFormat, previewNumber, validateNumberFormat } from "@/lib/numbering";
import { cn } from "@/lib/utils";

const TOKENS = [
  { t: "{SEQ}", d: "nomor urut (wajib)" }, { t: "{CODE}", d: "kode kategori" }, { t: "{MONTH_ROMAN}", d: "bulan romawi" },
  { t: "{MONTH}", d: "bulan angka" }, { t: "{YEAR}", d: "tahun" },
];
const EXAMPLES = ["{SEQ}/{CODE}/{MONTH_ROMAN}/{YEAR}", "{SEQ}/{CODE}/{YEAR}", "{CODE}/{SEQ}/{MONTH}/{YEAR}"];

/** Kolom format nomor dengan tombol sisip, contoh, pratinjau langsung, dan pesan kesalahan yang jelas. */
export function NumberFormatField({ defaultValue, pad }: { defaultValue: string; pad: number }) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const normalized = useMemo(() => normalizeNumberFormat(value), [value]);
  const error = normalized ? validateNumberFormat(normalized) : null;
  const preview = normalized && !error ? previewNumber(normalized, 1, pad, new Date(), "UMUM") : null;

  const insert = (token: string) => {
    const el = ref.current; if (!el) return;
    const start = el.selectionStart ?? value.length, end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + token.length, start + token.length); });
  };

  return (
    <div className="space-y-2.5">
      <input ref={ref} id="number_format" name="number_format" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" spellCheck={false}
        aria-describedby="nf-help nf-state" aria-invalid={!!error}
        className={cn("block w-full min-h-[40px] rounded-md border bg-white px-3 py-2 font-mono text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600", error ? "border-bad" : "border-line-strong")} />
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sisipkan kode">
        {TOKENS.map((x) => (
          <button key={x.t} type="button" onClick={() => insert(x.t)} title={x.d}
            className="rounded-md border border-line-strong bg-white px-2.5 py-1 font-mono text-xs text-navy-800 hover:border-navy-600 hover:bg-navy-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600">{x.t}</button>
        ))}
      </div>
      <p id="nf-help" className="text-xs text-ink-mute">Klik tombol di atas untuk menyisipkan kode, atau ketik sendiri. Yang wajib hanya <strong className="font-mono">{"{SEQ}"}</strong> (nomor urut); sisanya boleh diganti teks biasa seperti singkatan sekolah.</p>
      <p id="nf-state" aria-live="polite" className={cn("text-sm", error ? "text-bad" : "text-ink-soft")}>
        {error ? error : preview ? <>Contoh hasil: <strong className="font-mono text-navy-900">{preview}</strong>{normalized !== value.trim() && <span className="text-ink-mute"> (penulisan dirapikan otomatis)</span>}</> : "Kosong: surat belum dapat diberi nomor sampai format diisi."}
      </p>
      <details className="text-xs text-ink-mute">
        <summary className="cursor-pointer select-none hover:text-ink">Lihat contoh bentuk format</summary>
        <ul className="mt-2 space-y-1">
          {EXAMPLES.map((ex) => (
            <li key={ex} className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setValue(ex)} className="rounded border border-line-strong bg-white px-2 py-0.5 font-mono text-navy-800 hover:bg-navy-50">{ex}</button><span>menjadi {previewNumber(ex, 1, pad, new Date(), "UMUM")}</span></li>
          ))}
          <li className="pt-1 italic">Ini hanya contoh bentuk, bukan format resmi. Gunakan format yang berlaku di sekolah Anda.</li>
        </ul>
      </details>
    </div>
  );
}