const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

export function validateNumberFormat(fmt: string): string | null {
  if (!fmt.trim()) return "Format tidak boleh kosong";
  if (!fmt.includes("{SEQ}")) return "Format wajib memuat {SEQ}";
  const tokens = fmt.match(/\{[^}]*\}/g) ?? [];
  const allowed = ["{SEQ}", "{YEAR}", "{MONTH}", "{MONTH_ROMAN}", "{CODE}"];
  const bad = tokens.find((t) => !allowed.includes(t));
  if (bad) return `Token tidak dikenal: ${bad}`;
  return null;
}

/** Pratinjau saja; nomor resmi dialokasikan di database (_allocate_number). */
export function previewNumber(fmt: string, seq: number, pad: number, date: Date, code = "UMUM"): string {
  return fmt
    .replace("{SEQ}", String(seq).padStart(pad, "0"))
    .replace("{YEAR}", String(date.getFullYear()))
    .replace("{MONTH}", String(date.getMonth() + 1).padStart(2, "0"))
    .replace("{MONTH_ROMAN}", ROMAN[date.getMonth()])
    .replace("{CODE}", code || "UMUM");
}
