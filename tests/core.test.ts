import { describe, it, expect } from "vitest";
import { canTransitionIncoming, canTransitionDisposition, canOutgoingAction, OUTGOING_ACTIONS } from "@/lib/workflow";
import { validateNumberFormat, previewNumber } from "@/lib/numbering";
import { csvCell, sanitizeSearch, safeNext, safeFileName } from "@/lib/utils";
import { validateUpload, sniffMime } from "@/lib/upload";
import { can } from "@/lib/permissions";
import { incomingSchema, dispositionSchema, outgoingSchema } from "@/lib/validation";
import { renderTemplate, unknownPlaceholders } from "@/lib/templates";
import { toWinAnsi, wrapText } from "@/lib/pdf";
import { StandardFonts, PDFDocument } from "pdf-lib";

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);

describe("workflow", () => {
  it("surat masuk: transisi valid dan tidak valid", () => {
    expect(canTransitionIncoming("DICATAT", "DIVERIFIKASI")).toBe(true);
    expect(canTransitionIncoming("DICATAT", "SELESAI")).toBe(false);
    expect(canTransitionIncoming("DIARSIPKAN", "DICATAT")).toBe(false);
  });
  it("disposisi: rantai status", () => {
    expect(canTransitionDisposition("MENUNGGU", "DITERIMA")).toBe(true);
    expect(canTransitionDisposition("MENUNGGU", "SELESAI")).toBe(false);
    expect(canTransitionDisposition("SELESAI", "DITERIMA")).toBe(false);
  });
  it("surat keluar: aksi mengikuti status", () => {
    expect(canOutgoingAction("DRAFT", "SUBMIT")).toBe(true);
    expect(canOutgoingAction("DRAFT", "APPROVE")).toBe(false);
    expect(canOutgoingAction("DITINJAU", "APPROVE")).toBe(true);
    expect(OUTGOING_ACTIONS.APPROVE.to).toBe("DISETUJUI");
  });
});

describe("penomoran", () => {
  it("memvalidasi format", () => {
    expect(validateNumberFormat("")).not.toBeNull();
    expect(validateNumberFormat("{YEAR}")).toMatch(/SEQ/);
    expect(validateNumberFormat("{SEQ}/{FOO}")).toMatch(/FOO/);
    expect(validateNumberFormat("{SEQ}/{CODE}/{MONTH_ROMAN}/{YEAR}")).toBeNull();
  });
  it("pratinjau", () => {
    expect(previewNumber("{SEQ}/{MONTH_ROMAN}/{YEAR}", 7, 3, new Date(2026, 10, 18))).toBe("007/XI/2026");
  });
});

describe("keamanan input", () => {
  it("csv mencegah formula injection", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(csvCell('a"b')).toBe(`"a""b"`);
    expect(csvCell(null)).toBe(`""`);
  });
  it("sanitasi pencarian", () => {
    expect(sanitizeSearch("a,b)(%_*")).not.toMatch(/[,()%*_]/);
    expect(sanitizeSearch("x".repeat(200)).length).toBe(80);
  });
  it("open redirect ditolak", () => {
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("/surat-masuk")).toBe("/surat-masuk");
  });
  it("nama berkas aman", () => {
    expect(safeFileName("../../etc/passwd")).not.toContain("/");
    expect(safeFileName("")).toBe("berkas");
  });
});

describe("upload", () => {
  it("deteksi magic bytes", () => { expect(sniffMime(PDF)).toBe("application/pdf"); expect(sniffMime(PNG)).toBe("image/png"); expect(sniffMime(new Uint8Array([1, 2, 3]))).toBeNull(); });
  it("menolak ekstensi tidak cocok isi", () => { expect(validateUpload("virus.pdf", 100, PNG, 1000).ok).toBe(false); });
  it("menolak terlalu besar dan kosong", () => { expect(validateUpload("a.pdf", 5000, PDF, 1000).ok).toBe(false); expect(validateUpload("a.pdf", 0, PDF, 1000).ok).toBe(false); });
  it("menerima pdf sah", () => { expect(validateUpload("a.pdf", 500, PDF, 1000)).toMatchObject({ ok: true, mime: "application/pdf" }); });
});

describe("izin", () => {
  it("can()", () => { expect(can(["archives.view"], "archives.view")).toBe(true); expect(can(new Set<string>(), "users.manage")).toBe(false); });
});

describe("validasi", () => {
  const base = { letter_date: "2026-11-01", received_date: "2026-11-02", sender: "Dinas", subject: "Undangan", nature: "BIASA" };
  it("surat masuk valid", () => { expect(incomingSchema.safeParse(base).success).toBe(true); });
  it("tanggal diterima sebelum tanggal surat ditolak", () => { expect(incomingSchema.safeParse({ ...base, received_date: "2026-10-01" }).success).toBe(false); });
  it("sifat tidak dikenal ditolak", () => { expect(incomingSchema.safeParse({ ...base, nature: "X" }).success).toBe(false); });
  it("disposisi butuh penerima", () => { expect(dispositionSchema.safeParse({ incoming_id: "00000000-0000-4000-8000-000000000000", assignees: [], instruction: "Tindak lanjuti", priority: "NORMAL" }).success).toBe(false); });
  it("surat keluar valid", () => { expect(outgoingSchema.safeParse({ recipient: "Dinas", subject: "Permohonan", letter_date: "2026-11-01", nature: "BIASA", body: "" }).success).toBe(true); });
});

describe("template", () => {
  it("mengganti placeholder dikenal", () => { expect(renderTemplate("Yth. {{recipient}}", { recipient: "Bapak A" })).toBe("Yth. Bapak A"); });
  it("membiarkan placeholder kosong/tak dikenal", () => { expect(renderTemplate("{{school_name}} {{x}}", {})).toBe("{{school_name}} {{x}}"); });
  it("mendeteksi placeholder tak dikenal", () => { expect(unknownPlaceholders("{{recipient}} {{foo}}")).toEqual(["foo"]); });
});

describe("pdf", () => {
  it("normalisasi karakter non-WinAnsi", () => { expect(toWinAnsi("a\u2014b \u4e2d")).toBe("a-b ?"); });
  it("wrap tidak melebihi lebar", async () => {
    const pdf = await PDFDocument.create(); const f = await pdf.embedFont(StandardFonts.TimesRoman);
    const lines = wrapText("kata ".repeat(80) + "x".repeat(300), f, 12, 300);
    expect(lines.every((l) => f.widthOfTextAtSize(l, 12) <= 300.5)).toBe(true);
  });
});
