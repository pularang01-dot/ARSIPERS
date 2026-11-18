import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export type PdfLetter = { number: string; recipient: string; subject: string; body: string; letter_date: string; nature: string; attachment_note?: string | null };
export type PdfSchool = { name?: string | null; address?: string | null; phone?: string | null; email?: string | null; principal_name?: string | null; principal_nip?: string | null; letterhead_note?: string | null };

/** Fonts standar PDF hanya mendukung WinAnsi: normalisasi karakter lain agar tidak menggagalkan pembuatan PDF. */
export function toWinAnsi(s: string): string {
  return s
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-").replace(/\u2026/g, "...")
    .replace(/\t/g, "    ")
    .split("").map((c) => { const k = c.charCodeAt(0); return c === "\n" || (k >= 32 && k <= 126) || (k >= 160 && k <= 255) ? c : "?"; }).join("");
}

export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of toWinAnsi(text).split("\n")) {
    if (!para.trim()) { out.push(""); continue; }
    let line = "";
    for (const word of para.split(/\s+/)) {
      let w = word;
      while (font.widthOfTextAtSize(w, size) > maxWidth) {           // kata sangat panjang
        let i = w.length; while (i > 1 && font.widthOfTextAtSize(w.slice(0, i), size) > maxWidth) i--;
        if (line) { out.push(line); line = ""; }
        out.push(w.slice(0, i)); w = w.slice(i);
      }
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) <= maxWidth) line = test; else { out.push(line); line = w; }
    }
    out.push(line);
  }
  return out;
}

export async function buildLetterPdf(letter: PdfLetter, school: PdfSchool, dateLabel: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const reg = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const W = 595.28, H = 841.89, MX = 70, MT = 60, MB = 60, SIZE = 12, LEAD = 16;
  const maxW = W - MX * 2;
  let page = pdf.addPage([W, H]);
  let y = H - MT;
  const ink = rgb(0.08, 0.1, 0.15);

  const ensure = (need: number) => { if (y - need < MB) { page = pdf.addPage([W, H]); y = H - MT; } };
  const text = (t: string, opts: { font?: PDFFont; size?: number; x?: number; center?: boolean } = {}) => {
    const f = opts.font ?? reg; const sz = opts.size ?? SIZE; const s = toWinAnsi(t);
    ensure(LEAD);
    const x = opts.center ? (W - f.widthOfTextAtSize(s, sz)) / 2 : opts.x ?? MX;
    page.drawText(s, { x, y: y - sz, size: sz, font: f, color: ink });
    y -= LEAD;
  };

  // Kop surat: hanya data yang diisi sekolah. Tidak ada logo/stempel/tanda tangan buatan.
  if (school.name) text(school.name.toUpperCase(), { font: bold, size: 14, center: true });
  for (const l of [school.address, [school.phone, school.email].filter(Boolean).join(" | "), school.letterhead_note]) if (l) text(l, { size: 10, center: true });
  if (school.name || school.address) { y -= 4; page.drawLine({ start: { x: MX, y }, end: { x: W - MX, y }, thickness: 1.2, color: ink }); y -= 16; }

  const meta: [string, string][] = [["Nomor", letter.number], ["Sifat", letter.nature[0] + letter.nature.slice(1).toLowerCase()], ["Lampiran", letter.attachment_note || "-"], ["Perihal", letter.subject]];
  for (const [k, v] of meta) {
    const lines = wrapText(v, reg, SIZE, maxW - 80);
    lines.forEach((ln, i) => { ensure(LEAD); if (i === 0) { page.drawText(k, { x: MX, y: y - SIZE, size: SIZE, font: reg, color: ink }); page.drawText(":", { x: MX + 65, y: y - SIZE, size: SIZE, font: reg, color: ink }); } page.drawText(ln, { x: MX + 75, y: y - SIZE, size: SIZE, font: reg, color: ink }); y -= LEAD; });
  }
  y -= 8;
  text(`Sumenep, ${dateLabel}`, { x: W - MX - reg.widthOfTextAtSize(toWinAnsi(`Sumenep, ${dateLabel}`), SIZE) });
  y -= 4;
  text("Yth.", {}); for (const ln of wrapText(letter.recipient, reg, SIZE, maxW)) text(ln);
  y -= 8;
  for (const ln of wrapText(letter.body, reg, SIZE, maxW)) { if (!ln) { y -= LEAD / 2; continue; } text(ln); }

  y -= 20; ensure(110);
  const sx = W - MX - 190;
  text("Kepala Sekolah,", { x: sx });
  y -= 56; // ruang tanda tangan manual
  if (school.principal_name) text(school.principal_name, { x: sx, font: bold });
  if (school.principal_nip) text(`NIP ${school.principal_nip}`, { x: sx, size: 11 });
  return pdf.save();
}
