/** Kolom isian yang dapat disisipkan ke template. `key` = penulisan bahasa Indonesia, `alias` = penulisan lama (tetap berlaku). */
export const TEMPLATE_FIELDS = [
  { key: "tujuan", alias: "recipient", label: "Tujuan surat" },
  { key: "perihal", alias: "subject", label: "Perihal" },
  { key: "tanggal", alias: "date", label: "Tanggal surat" },
  { key: "nama_sekolah", alias: "school_name", label: "Nama sekolah" },
  { key: "kepala_sekolah", alias: "principal_name", label: "Nama kepala sekolah" },
  { key: "nip_kepala_sekolah", alias: "principal_nip", label: "NIP kepala sekolah" },
] as const;

type Alias = (typeof TEMPLATE_FIELDS)[number]["alias"];
export type TemplateData = Partial<Record<Alias, string | null | undefined>>;
/** Dipertahankan agar kode lama tetap berfungsi. */
export const TEMPLATE_PLACEHOLDERS = TEMPLATE_FIELDS.map((f) => f.alias);

const PATTERN = /\{\{\s*([A-Za-z_]+)\s*\}\}/g;
const lookup = (name: string) => TEMPLATE_FIELDS.find((f) => f.key === name.toLowerCase() || f.alias === name.toLowerCase());

/** {{tujuan}} atau {{recipient}} diganti nilainya. Bila nilainya kosong atau nama tidak dikenal, penanda dibiarkan agar terlihat. */
export function renderTemplate(body: string, data: TemplateData): string {
  return body.replace(PATTERN, (m, name: string) => {
    const f = lookup(name);
    if (!f) return m;
    const v = data[f.alias];
    return v ? String(v) : m;
  });
}

export function unknownPlaceholders(body: string): string[] {
  const found = Array.from(body.matchAll(PATTERN)).map((m) => m[1]);
  return Array.from(new Set(found.filter((k) => !lookup(k))));
}

/** Jumlah bagian [isi ...] yang masih harus dilengkapi saat surat dibuat. */
export function countFillIns(body: string): number {
  return (body.match(/\[[^\]\n]{2,}\]/g) ?? []).length;
}