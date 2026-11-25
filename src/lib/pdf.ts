import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { kopLines, parseBody, spaceOut, titleForType, type RuleStyle } from "@/lib/letterhead";

export type PdfLetter = { number: string; recipient: string; subject: string; body: string; letter_date: string; nature: string; attachment_note?: string | null; letter_type?: string | null };
export type PdfSchool = {
  name?: string | null; address?: string | null; phone?: string | null; email?: string | null; principal_name?: string | null; principal_nip?: string | null;
  letterhead_note?: string | null; letterhead_parent?: string | null; letterhead_rule?: string | null; letter_city?: string | null; logo_data?: string | null; logo_mime?: string | null;
};

/** Font standar PDF hanya mendukung WinAnsi: normalisasi karakter lain agar tidak menggagalkan pembuatan PDF. */
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
      while (font.widthOfTextAtSize(w, size) > maxWidth) {
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
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const W = 595.28, H = 841.89, MX = 72, MT = 46, MB = 56, SIZE = 12, LEAD = 17.5;
  const maxW = W - MX * 2;
  const ink = rgb(0.06, 0.07, 0.1);
  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - MT;

  const ensure = (need: number) => { if (y - need < MB) { page = pdf.addPage([W, H]); y = H - MT; } };
  const draw = (t: string, x: number, f: PDFFont, size: number) => page.drawText(toWinAnsi(t), { x, y: y - size, size, font: f, color: ink });
  const line = (t: string, opts: { f?: PDFFont; size?: number; x?: number; center?: boolean; right?: boolean; lead?: number } = {}) => {
    const f = opts.f ?? reg, sz = opts.size ?? SIZE, s = toWinAnsi(t), lead = opts.lead ?? LEAD;
    ensure(lead);
    const w = f.widthOfTextAtSize(s, sz);
    const x = opts.center ? (W - w) / 2 : opts.right ? W - MX - w : opts.x ?? MX;
    page.drawText(s, { x, y: y - sz, size: sz, font: f, color: ink });
    y -= lead;
    return { x, w };
  };

  // ---------- Kop surat (mengikuti Pengaturan) ----------
  const k = kopLines({ letterhead_parent: school.letterhead_parent, name: school.name, address: school.address, phone: school.phone, email: school.email, letterhead_note: school.letterhead_note });
  let logoImg: Awaited<ReturnType<PDFDocument["embedPng"]>> | null = null;
  if (school.logo_data && school.logo_mime) {
    try {
      const bytes = Uint8Array.from(Buffer.from(school.logo_data, "base64"));
      logoImg = school.logo_mime === "image/png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    } catch { logoImg = null; /* logo rusak: cetak tanpa logo, jangan menggagalkan PDF */ }
  }
  const hasText = !!(k.parent || k.name || k.address || k.contact || k.note);
  if (hasText || logoImg) {
    const logoH = 64;
    const logoW = logoImg ? Math.min(80, (logoImg.width / logoImg.height) * logoH) : 0;
    const drawnLogoH = logoImg ? (logoW / logoImg.width) * logoImg.height : 0;
    const left = MX + (logoImg ? logoW + 10 : 0);            // teks dipusatkan di area kanan logo, seperti pada contoh surat
    const textW = W - MX - left;
    const centerX = left + textW / 2;
    const rows: { t: string; f: PDFFont; s: number }[] = [];
    const push = (t: string | undefined, f: PDFFont, s: number) => { if (t) wrapText(t, f, s, textW).forEach((l) => rows.push({ t: l, f, s })); };
    push(k.parent, sans, 11.5); push(k.name, sansBold, 15.5); push(k.address, sans, 9.5); push(k.contact, sans, 9.5); push(k.note, sans, 9.5);
    const lead = (s: number) => s * 1.28;
    const textH = rows.reduce((a, r) => a + lead(r.s), 0);
    const blockH = Math.max(drawnLogoH, textH);
    ensure(blockH + 30);
    if (logoImg) page.drawImage(logoImg, { x: MX, y: y - (blockH + drawnLogoH) / 2, width: logoW, height: drawnLogoH });
    let ty = y - (blockH - textH) / 2;
    for (const r of rows) {
      const w = r.f.widthOfTextAtSize(r.t, r.s);
      page.drawText(r.t, { x: centerX - w / 2, y: ty - r.s, size: r.s, font: r.f, color: ink });
      ty -= lead(r.s);
    }
    y -= blockH + 7;
    const rule = (school.letterhead_rule ?? "THICK") as RuleStyle;
    if (rule === "THICK") { page.drawLine({ start: { x: MX, y }, end: { x: W - MX, y }, thickness: 3, color: ink }); y -= 3; }
    else if (rule === "DOUBLE") { page.drawLine({ start: { x: MX, y }, end: { x: W - MX, y }, thickness: 3, color: ink }); y -= 6; page.drawLine({ start: { x: MX, y }, end: { x: W - MX, y }, thickness: 0.8, color: ink }); y -= 2; }
    y -= 20;
  }

  const city = school.letter_city?.trim() || "Sumenep";
  const title = titleForType(letter.letter_type);

  if (title) {
    // ---------- Surat bertitel (mis. Surat Tugas) ----------
    const spaced = spaceOut(title);
    const t = line(spaced, { f: bold, size: 13, center: true, lead: 20 });
    page.drawLine({ start: { x: t.x, y: y + 20 - 13 - 2.5 }, end: { x: t.x + t.w, y: y + 20 - 13 - 2.5 }, thickness: 0.9, color: ink });
    line(`Nomor: ${letter.number}`, { center: true, lead: 28 });
  } else {
    // ---------- Surat biasa: nomor, lampiran, perihal, tanggal, Yth. ----------
    const meta: [string, string][] = [["Nomor", letter.number], ["Sifat", letter.nature[0] + letter.nature.slice(1).toLowerCase()], ["Lampiran", letter.attachment_note || "-"], ["Perihal", letter.subject]];
    for (const [kk, v] of meta) {
      const ls = wrapText(v, reg, SIZE, maxW - 90);
      ls.forEach((ln, i) => { ensure(LEAD); if (i === 0) { page.drawText(kk, { x: MX, y: y - SIZE, size: SIZE, font: reg, color: ink }); page.drawText(":", { x: MX + 66, y: y - SIZE, size: SIZE, font: reg, color: ink }); } page.drawText(ln, { x: MX + 78, y: y - SIZE, size: SIZE, font: reg, color: ink }); y -= LEAD; });
    }
    y -= 6;
    line(`${city}, ${dateLabel}`, { right: true });
    y -= 4;
    line("Yth.");
    for (const ln of wrapText(letter.recipient, reg, SIZE, maxW)) line(ln);
    y -= 8;
  }

  // ---------- Isi surat (blok "Label : isi" diratakan seperti tabel) ----------
  for (const b of parseBody(letter.body)) {
    if (b.kind === "blank") { y -= LEAD * 0.6; continue; }
    if (b.kind === "p") { for (const ln of wrapText(b.text, reg, SIZE, maxW)) line(ln); continue; }
    const x0 = MX + 28;
    const labelW = Math.max(...b.rows.map((r) => reg.widthOfTextAtSize(toWinAnsi(r.label), SIZE))) + 8;
    const vx = x0 + labelW + 12;
    for (const r of b.rows) {
      const vals = wrapText(r.value, reg, SIZE, W - MX - vx);
      vals.forEach((vl, i) => {
        ensure(LEAD);
        if (i === 0) { page.drawText(toWinAnsi(r.label), { x: x0, y: y - SIZE, size: SIZE, font: reg, color: ink }); page.drawText(":", { x: x0 + labelW, y: y - SIZE, size: SIZE, font: reg, color: ink }); }
        page.drawText(vl, { x: vx, y: y - SIZE, size: SIZE, font: reg, color: ink });
        y -= LEAD;
      });
    }
  }

  // ---------- Tanda tangan ----------
  y -= 18; ensure(120);
  const sx = W - MX - 200;
  if (title) { draw(`${city}, ${dateLabel}`, sx, reg, SIZE); y -= LEAD; }
  draw(school.name ? `Kepala ${school.name}` : "Kepala Sekolah", sx, reg, SIZE); y -= LEAD;
  y -= 52; // ruang tanda tangan dan stempel manual
  if (school.principal_name) { draw(school.principal_name, sx, reg, SIZE); y -= LEAD; }
  if (school.principal_nip) { draw(`NIP ${school.principal_nip}`, sx, reg, 11); y -= LEAD; }
  return pdf.save();
}