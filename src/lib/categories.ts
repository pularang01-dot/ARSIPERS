/** Buat kode kategori otomatis dari nama, mis. "Surat Tugas" -> "SURAT-TUGAS" (maks. 20 karakter). */
export function categoryCodeFromName(name: string): string {
  return name
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 20).replace(/-+$/g, "");
}

/** Rapikan kode yang diketik manual: spasi menjadi strip, karakter tak valid dibuang. */
export function normalizeCategoryCode(code: string): string {
  return code.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[\s_]+/g, "-").replace(/[^A-Z0-9.\-]/g, "").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "").slice(0, 20);
}