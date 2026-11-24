const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
const TOKENS = ["SEQ", "YEAR", "MONTH", "MONTH_ROMAN", "CODE"] as const;
export const NUMBER_TOKENS = TOKENS.map((t) => `{${t}}`);

/** Rapikan kesalahan ketik umum: {seq}, { SEQ }, atau SEQ tanpa kurung kurawal menjadi {SEQ}. */
export function normalizeNumberFormat(fmt: string): string {
  let s = fmt.trim().replace(/\s+/g, " ");
  s = s.replace(/\{\s*([A-Za-z_]+)\s*\}/g, (m, k: string) => ((TOKENS as readonly string[]).includes(k.toUpperCase()) ? `{${k.toUpperCase()}}` : m));
  // kata utuh SEQ/YEAR/CODE... tanpa kurung kurawal -> beri kurung kurawal
  for (const t of TOKENS) s = s.replace(new RegExp(`(?<![{A-Za-z_])${t}(?![}A-Za-z_])`, "g"), `{${t}}`);
  return s;
}

export function validateNumberFormat(fmt: string): string | null {
  if (!fmt.trim()) return "Format tidak boleh kosong";
  if (!fmt.includes("{SEQ}")) return "Format harus memuat {SEQ} (huruf besar, dengan kurung kurawal) sebagai tempat nomor urut. Contoh: {SEQ}/{CODE}/{MONTH_ROMAN}/{YEAR}";
  const tokens = fmt.match(/\{[^}]*\}/g) ?? [];
  const bad = tokens.find((t) => !NUMBER_TOKENS.includes(t));
  if (bad) return `Kode ${bad} tidak dikenal. Yang tersedia: ${NUMBER_TOKENS.join(", ")}.`;
  return null;
}

/** Pratinjau saja; nomor resmi dialokasikan di database (_allocate_number). */
export function previewNumber(fmt: string, seq: number, pad: number, date: Date, code = "UMUM"): string {
  const rep = (s: string, token: string, v: string) => s.split(token).join(v);
  let out = fmt;
  out = rep(out, "{SEQ}", String(seq).padStart(pad, "0"));
  out = rep(out, "{YEAR}", String(date.getFullYear()));
  out = rep(out, "{MONTH_ROMAN}", ROMAN[date.getMonth()]);
  out = rep(out, "{MONTH}", String(date.getMonth() + 1).padStart(2, "0"));
  out = rep(out, "{CODE}", code || "UMUM");
  return out;
}