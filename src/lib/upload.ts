export const ALLOWED_MIME: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
};

export function maxUploadBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_MB ?? "5");
  return (Number.isFinite(mb) && mb > 0 ? Math.min(mb, 10) : 5) * 1024 * 1024;
}

/** Deteksi tipe dari magic bytes; MIME dari browser tidak dipercaya. */
export function sniffMime(bytes: Uint8Array): string | null {
  const starts = (sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  return null;
}

export type UploadCheck = { ok: true; mime: string; ext: string } | { ok: false; error: string };

export function validateUpload(fileName: string, size: number, head: Uint8Array, maxBytes = maxUploadBytes()): UploadCheck {
  if (size <= 0) return { ok: false, error: "Berkas kosong" };
  if (size > maxBytes) return { ok: false, error: `Ukuran berkas melebihi ${Math.round(maxBytes / 1024 / 1024)} MB` };
  const mime = sniffMime(head);
  if (!mime) return { ok: false, error: "Hanya PDF, JPG, atau PNG yang diizinkan" };
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_MIME[mime].includes(ext)) return { ok: false, error: "Ekstensi berkas tidak sesuai isi berkas" };
  return { ok: true, mime, ext };
}
