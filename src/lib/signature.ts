/** Kode verifikasi 12 karakter hex ditampilkan berkelompok: ABCD-1234-EF56. */
export function formatCode(code: string): string {
  const c = code.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
  return c.length === 12 ? `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}` : code;
}

/** "Kepala Sekolah" + "SDN Pandian I" -> "Kepala SDN Pandian I"; "Plt. Kepala Sekolah" -> "Plt. Kepala SDN Pandian I". */
export function signerTitle(position: string | null | undefined, schoolName?: string | null): string {
  const p = (position ?? "").trim() || "Kepala Sekolah";
  return schoolName && /sekolah/i.test(p) ? p.replace(/sekolah/i, schoolName.trim()) : p;
}

export const SIGNATORY_STATUS_LABEL: Record<string, string> = { ACTIVE: "Berlaku", ENDED: "Berakhir", REVOKED: "Dicabut" };
export const VERIFY_STATE_LABEL: Record<string, string> = { SAH: "Sah", DITARIK: "Ditarik", DIGANTI: "Versi surat telah berganti", UJI_COBA: "Surat uji coba" };