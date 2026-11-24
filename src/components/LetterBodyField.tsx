"use client";
import { useState } from "react";
import { buttonClass, inputClass } from "@/components/ui";
import { renderTemplate } from "@/lib/templates";
import { cn, formatDate } from "@/lib/utils";

type Tpl = { id: string; name: string; body: string };
type School = { name?: string | null; principal_name?: string | null; principal_nip?: string | null };

/** Isi surat + pilihan template: memilih template langsung mengisi kotak isi memakai tujuan, perihal, dan tanggal yang sudah diketik. */
export function LetterBodyField({ templates, school, defaultBody, defaultTemplateId, showPicker }: { templates: Tpl[]; school: School; defaultBody: string; defaultTemplateId?: string | null; showPicker: boolean }) {
  const [body, setBody] = useState(defaultBody);
  const [tpl, setTpl] = useState(defaultTemplateId ?? "");
  const val = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? "";

  const apply = (id: string, ask = true) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    if (ask && body.trim() && !window.confirm("Isi surat saat ini akan diganti dengan template. Lanjutkan?")) { setTpl(""); return; }
    const d = val("letter_date");
    setBody(renderTemplate(t.body, { recipient: val("recipient"), subject: val("subject"), date: d ? formatDate(d) : "", school_name: school.name, principal_name: school.principal_name, principal_nip: school.principal_nip }));
  };

  return (
    <>
      {showPicker && templates.length > 0 && (
        <div className="sm:col-span-2 rounded-lg border border-line-strong bg-surface p-4">
          <label htmlFor="template_id" className="block text-sm font-medium text-ink">Mulai dari template <span className="text-xs font-normal text-ink-mute">(opsional)</span></label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select id="template_id" name="template_id" value={tpl} onChange={(e) => { setTpl(e.target.value); if (e.target.value) apply(e.target.value); }} className={cn(inputClass, "w-auto min-w-[14rem]")}>
              <option value="">Tanpa template</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {tpl && <button type="button" onClick={() => apply(tpl)} className={buttonClass("secondary", "min-h-[40px] px-3 text-sm")}>Isi ulang dari template</button>}
          </div>
          <p className="mt-2 text-xs text-ink-mute">Isi tujuan, perihal, dan tanggal lebih dulu agar otomatis masuk ke isi surat. Bagian <strong>[isi ...]</strong> perlu Anda lengkapi sendiri.</p>
        </div>
      )}
      <div className="sm:col-span-2">
        <label htmlFor="body" className="mb-1.5 block text-sm font-medium text-ink">Isi</label>
        <textarea id="body" name="body" rows={16} value={body} onChange={(e) => setBody(e.target.value)} maxLength={20000} className={cn(inputClass, "font-display text-[15px] leading-7")} />
        {/\[[^\]\n]{2,}\]/.test(body) && <p className="mt-1.5 text-xs text-brass-dark">Masih ada bagian [isi ...] yang belum dilengkapi.</p>}
      </div>
    </>
  );
}