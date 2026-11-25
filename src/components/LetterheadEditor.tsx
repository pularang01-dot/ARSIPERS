"use client";
import { useEffect, useState } from "react";
import { Field, inputClass } from "@/components/ui";
import { kopLines, RULE_LABEL, type RuleStyle } from "@/lib/letterhead";
import { cn } from "@/lib/utils";

type Defaults = { parent: string; name: string; address: string; phone: string; email: string; note: string; rule: RuleStyle; city: string; logoSrc: string | null };

/** Kop surat: kolom isian + pratinjau yang berubah langsung. Semua hasilnya dipakai otomatis pada PDF surat keluar. */
export function LetterheadEditor({ defaults }: { defaults: Defaults }) {
  const [v, setV] = useState({ parent: defaults.parent, name: defaults.name, address: defaults.address, phone: defaults.phone, email: defaults.email, note: defaults.note, rule: defaults.rule, city: defaults.city });
  const [logo, setLogo] = useState<string | null>(defaults.logoSrc);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [logoError, setLogoError] = useState("");
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => () => { if (logo && logo.startsWith("blob:")) URL.revokeObjectURL(logo); }, [logo]);
  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; setLogoError("");
    if (!f) { setLogo(defaults.logoSrc); return; }
    if (!["image/png", "image/jpeg"].includes(f.type)) { setLogoError("Logo harus PNG atau JPG."); e.target.value = ""; return; }
    if (f.size > 300 * 1024) { setLogoError("Ukuran logo maksimal 300 KB. Perkecil gambarnya terlebih dahulu."); e.target.value = ""; return; }
    setRemoveLogo(false); setLogo(URL.createObjectURL(f));
  };

  const k = kopLines({ letterhead_parent: v.parent, name: v.name, address: v.address, phone: v.phone, email: v.email, letterhead_note: v.note });
  const shownLogo = removeLogo ? null : logo;
  const empty = !k.parent && !k.name && !k.address && !k.contact && !k.note && !shownLogo;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
      <div className="space-y-4">
        <Field label="Baris 1: instansi induk" htmlFor="letterhead_parent" optional hint="Mis. nama pemerintah daerah atau dinas. Kosongkan bila tidak ada.">
          <input id="letterhead_parent" name="letterhead_parent" value={v.parent} onChange={set("parent")} maxLength={120} className={inputClass} placeholder="mis. Pemerintah Kabupaten ..." />
        </Field>
        <Field label="Baris 2: nama sekolah" htmlFor="name" hint="Dicetak tebal dan huruf besar."><input id="name" name="name" value={v.name} onChange={set("name")} maxLength={200} className={inputClass} /></Field>
        <Field label="Alamat" htmlFor="address" optional><input id="address" name="address" value={v.address} onChange={set("address")} maxLength={500} className={inputClass} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telepon" htmlFor="phone" optional><input id="phone" name="phone" value={v.phone} onChange={set("phone")} maxLength={50} className={inputClass} /></Field>
          <Field label="Email sekolah" htmlFor="email" optional><input id="email" name="email" type="email" value={v.email} onChange={set("email")} className={inputClass} /></Field>
        </div>
        <Field label="Baris tambahan" htmlFor="letterhead_note" optional hint="Mis. NPSN atau laman web."><input id="letterhead_note" name="letterhead_note" value={v.note} onChange={set("note")} maxLength={500} className={inputClass} /></Field>
        <Field label="Kota penulisan surat" htmlFor="letter_city" optional hint="Untuk baris tanggal, mis. “Sumenep, 13 Oktober 2026”. Kosong = Sumenep."><input id="letter_city" name="letter_city" value={v.city} onChange={set("city")} maxLength={60} className={inputClass} /></Field>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">Garis di bawah kop</legend>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(RULE_LABEL) as RuleStyle[]).map((r) => (
              <label key={r} className="relative cursor-pointer">
                <input type="radio" name="letterhead_rule" value={r} checked={v.rule === r} onChange={() => setV((s) => ({ ...s, rule: r }))} className="peer sr-only" />
                <span className="flex h-full items-center justify-center rounded-lg border border-line-strong bg-white px-2 py-2.5 text-center text-sm hover:border-navy-600 peer-checked:border-navy-700 peer-checked:bg-navy-50 peer-checked:font-medium peer-checked:ring-1 peer-checked:ring-navy-700 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-navy-600">{RULE_LABEL[r]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="logo" className="mb-1.5 block text-sm font-medium text-ink">Logo sekolah <span className="ml-1.5 text-xs font-normal text-ink-mute">(opsional)</span></label>
          <input id="logo" name="logo" type="file" accept="image/png,image/jpeg" onChange={onLogo} className={cn(inputClass, "py-1.5 file:mr-3 file:rounded-md file:border-0 file:bg-navy-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-navy-800")} />
          <p className="mt-1.5 text-xs text-ink-mute">PNG atau JPG, maksimal 300 KB. Gunakan gambar yang sudah dipotong rapi hanya pada lambangnya, idealnya berlatar putih atau transparan.</p>
          {logoError && <p role="alert" className="mt-1.5 text-xs text-bad">{logoError}</p>}
          {defaults.logoSrc && (
            <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="remove_logo" checked={removeLogo} onChange={(e) => setRemoveLogo(e.target.checked)} className="h-4 w-4" />Hapus logo yang tersimpan</label>
          )}
        </div>
      </div>

      <div className="xl:sticky xl:top-24 xl:self-start">
        <p className="mb-2 flex items-center justify-between text-sm font-semibold text-navy-900">Pratinjau kop surat <span className="text-xs font-normal text-ink-mute">berubah saat Anda mengetik</span></p>
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="mx-auto aspect-[1/1.2] w-full max-w-[560px] rounded-sm border border-line bg-white px-[7%] pt-[6%] shadow-lift" aria-label="Pratinjau kop surat">
            {empty ? <p className="py-10 text-center text-sm text-ink-mute">Isi kolom di samping untuk melihat kop surat.</p> : (
              <>
                <div className="flex items-center gap-[2%]">
                  {shownLogo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={shownLogo} alt="Logo sekolah" className="h-[15%] max-h-16 min-h-10 w-auto shrink-0 object-contain" style={{ height: "clamp(40px, 11vw, 64px)" }} />
                  )}
                  <div className="min-w-0 flex-1 text-center text-ink" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                    {k.parent && <p className="text-[11.5px] leading-tight sm:text-[13px]">{k.parent}</p>}
                    {k.name && <p className="text-[15px] font-bold leading-snug sm:text-[17px]">{k.name}</p>}
                    {k.address && <p className="text-[9.5px] leading-snug sm:text-[10.5px]">{k.address}</p>}
                    {k.contact && <p className="text-[9.5px] leading-snug sm:text-[10.5px]">{k.contact}</p>}
                    {k.note && <p className="text-[9.5px] leading-snug sm:text-[10.5px]">{k.note}</p>}
                  </div>
                </div>
                <div className="mt-2" aria-hidden>
                  {v.rule === "THICK" && <div className="h-[3px] bg-ink" />}
                  {v.rule === "DOUBLE" && <><div className="h-[3px] bg-ink" /><div className="mt-[3px] h-px bg-ink" /></>}
                </div>
                <div className="mt-6 space-y-2.5" aria-hidden>
                  <div className="mx-auto h-2.5 w-1/3 rounded bg-line" /><div className="mx-auto h-2 w-1/2 rounded bg-line" />
                  <div className="mt-5 h-2 rounded bg-line" /><div className="h-2 w-11/12 rounded bg-line" /><div className="h-2 w-10/12 rounded bg-line" />
                </div>
              </>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-ink-mute">Kop ini dipakai otomatis pada PDF semua surat keluar yang difinalkan.</p>
      </div>
    </div>
  );
}