/** Logika kop surat yang dipakai bersama oleh pratinjau di Pengaturan dan pembuatan PDF. */
export type LetterheadInput = {
  letterhead_parent?: string | null; name?: string | null; address?: string | null; phone?: string | null; email?: string | null; letterhead_note?: string | null;
};

export function contactLine(phone?: string | null, email?: string | null): string {
  return [phone?.trim() ? `Telp. ${phone.trim()}` : "", email?.trim() ? `Email : ${email.trim()}` : ""].filter(Boolean).join("  |  ");
}

/** Baris-baris teks kop dari atas ke bawah. Baris kosong tidak dicetak. */
export function kopLines(s: LetterheadInput): { parent?: string; name?: string; address?: string; contact?: string; note?: string } {
  const t = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);
  return {
    parent: t(s.letterhead_parent)?.toUpperCase(),
    name: t(s.name)?.toUpperCase(),
    address: t(s.address),
    contact: t(contactLine(s.phone, s.email)),
    note: t(s.letterhead_note),
  };
}

export type RuleStyle = "THICK" | "DOUBLE" | "NONE";
export const RULE_LABEL: Record<RuleStyle, string> = { THICK: "Garis tebal", DOUBLE: "Garis ganda", NONE: "Tanpa garis" };

/** "SURAT TUGAS" -> "S U R A T   T U G A S" seperti pada contoh surat. */
export function spaceOut(text: string): string {
  return text.trim().split(/\s+/).map((w) => w.split("").join(" ")).join("   ");
}

/** Jenis surat yang memakai tata letak bertitel di tengah (tanpa "Yth." dan perihal). */
export function titleForType(letterType?: string | null): string | null {
  const t = (letterType ?? "").toUpperCase();
  if (t.includes("TUGAS")) return "SURAT TUGAS";
  if (t.includes("KETERANGAN")) return "SURAT KETERANGAN";
  return null;
}

/** Baris "Label : isi" yang berurutan (minimal 2) diratakan seperti tabel. */
const KV = /^\s*([^\s:][^:]{0,24}?)\s*:\s+(\S.*)$/;
export type BodyBlock = { kind: "p"; text: string } | { kind: "blank" } | { kind: "kv"; rows: { label: string; value: string }[] };

export function parseBody(body: string): BodyBlock[] {
  const lines = body.replace(/\r/g, "").split("\n");
  const blocks: BodyBlock[] = [];
  let i = 0;
  const asKv = (line: string) => {
    const m = line.match(KV);
    if (!m) return null;
    const label = m[1].trim();
    if (label.split(/\s+/).length > 3 || /[.!?]$/.test(label)) return null;
    return { label, value: m[2].trim() };
  };
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { blocks.push({ kind: "blank" }); i++; continue; }
    const first = asKv(line);
    if (first) {
      const rows = [first]; let j = i + 1;
      while (j < lines.length) { const n = asKv(lines[j]); if (!n) break; rows.push(n); j++; }
      if (rows.length >= 2) { blocks.push({ kind: "kv", rows }); i = j; continue; }
    }
    blocks.push({ kind: "p", text: line.trim() }); i++;
  }
  return blocks;
}

/** Bagian [isi ...] yang belum dilengkapi. */
export const hasUnfilled = (body: string) => /\[isi[^\]]*\]/i.test(body);