import { ROLE_LABEL, type RoleCode } from "@/lib/permissions";
import { STATUS_LABEL } from "@/lib/constants";

/** Terjemahan catatan aktivitas (audit log) menjadi kalimat bahasa sehari-hari. */

export type AuditKind = "incoming" | "outgoing" | "disposition" | "profile" | "attachment" | "none";
export type AuditEntity = { kind: AuditKind; found: boolean; label?: string; href?: string; confidential?: boolean };
export type AuditSentence = { verb: string; object?: { text: string; href?: string }; extra?: string };
type Meta = Record<string, unknown>;

export const CATEGORIES: { value: string; label: string; actions: string[] }[] = [
  { value: "surat-masuk", label: "Surat masuk", actions: ["INCOMING_LETTER_CREATE", "INCOMING_LETTER_UPDATE", "INCOMING_STATUS"] },
  { value: "surat-keluar", label: "Surat keluar", actions: ["OUTGOING_LETTER_CREATE", "OUTGOING_LETTER_UPDATE", "OUTGOING_SUBMIT", "OUTGOING_REVIEW", "OUTGOING_REQUEST_REVISION", "OUTGOING_APPROVE", "OUTGOING_FINALIZE", "NUMBER_ALLOCATE", "OUTGOING_SEND", "OUTGOING_NEW_VERSION"] },
  { value: "disposisi", label: "Disposisi", actions: ["DISPOSITION_CREATE", "DISPOSITION_STATUS"] },
  { value: "arsip", label: "Arsip dan penghapusan", actions: ["ARCHIVE", "UNARCHIVE", "ARCHIVE_DELETE", "LETTER_DELETE"] },
  { value: "berkas", label: "Lampiran", actions: ["ATTACHMENT_CREATE", "FILE_DOWNLOAD"] },
  { value: "pengguna", label: "Pengguna", actions: ["USER_UPDATE", "USER_DELETE", "USER_INVITE_RESEND"] },
  { value: "pengaturan", label: "Pengaturan", actions: ["SCHOOL_SETTINGS_UPDATE", "LETTER_TEMPLATE_CREATE", "LETTER_TEMPLATE_UPDATE", "LETTER_CATEGORY_CREATE", "LETTER_CATEGORY_UPDATE"] },
  { value: "login", label: "Masuk dan keluar", actions: ["AUTH_LOGIN", "AUTH_LOGIN_GOOGLE", "AUTH_LOGOUT"] },
];

export function categoryOf(action: string): string {
  return CATEGORIES.find((c) => c.actions.includes(action))?.label ?? "Lainnya";
}

const COLUMN_LABEL: Record<string, string> = {
  subject: "perihal", sender: "pengirim", origin_org: "instansi asal", letter_date: "tanggal surat", received_date: "tanggal diterima",
  external_number: "nomor surat pengirim", category_id: "kategori", classification: "klasifikasi", nature: "sifat surat", summary: "ringkasan isi",
  needs_disposition: "penanda perlu disposisi", is_confidential: "status rahasia", recipient: "tujuan surat", body: "isi surat", letter_type: "jenis surat",
  attachment_note: "keterangan lampiran", template_id: "template", name: "nama", npsn: "NPSN", address: "alamat", phone: "nomor telepon", email: "email",
  principal_name: "nama kepala sekolah", principal_nip: "NIP kepala sekolah", letterhead_note: "catatan kop surat", number_format: "format nomor surat",
  number_seq_pad: "lebar nomor urut", number_reset: "aturan reset nomor", timezone: "zona waktu", code: "kode", is_active: "status aktif",
};

export function listText(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return items.slice(0, -1).join(", ") + " dan " + items[items.length - 1];
}

function changedColumns(meta: Meta): string | undefined {
  const cols = Array.isArray(meta.changed_columns) ? (meta.changed_columns as unknown[]).map(String).filter((c) => !["updated_by", "updated_at", "version"].includes(c)) : [];
  if (!cols.length) return undefined;
  return "Yang diubah: " + listText(cols.map((c) => COLUMN_LABEL[c] ?? c)) + ".";
}

const L = (v: unknown) => STATUS_LABEL[String(v)] ?? String(v ?? "");
const role = (v: unknown) => ROLE_LABEL[String(v) as RoleCode] ?? String(v ?? "");
const reason = (meta: Meta) => (meta.reason ? `Alasan: “${String(meta.reason)}”.` : undefined);
const fromTo = (meta: Meta) => (meta.from && meta.to ? `dari ${L(meta.from)} menjadi ${L(meta.to)}.` : undefined);

function objectOf(e: AuditEntity, meta: Meta): { text: string; href?: string } | undefined {
  if (e.kind === "none") return undefined;
  if (e.kind === "profile") {
    const name = e.found ? e.label : (meta.name as string | undefined) || (meta.email as string | undefined);
    return { text: name ? `${name}` : "seorang pengguna" };
  }
  if (!e.found) return { text: e.kind === "attachment" ? "sebuah berkas lampiran" : "sebuah surat yang sudah dihapus atau tidak dapat Anda lihat" };
  if (e.confidential) return { text: "sebuah surat rahasia", href: e.href };
  return { text: `“${e.label ?? "tanpa judul"}”`, href: e.href };
}

export function describeAudit(action: string, meta: Meta, e: AuditEntity): AuditSentence {
  const obj = objectOf(e, meta);
  const jenis = e.kind === "outgoing" ? "surat keluar" : "surat masuk";
  switch (action) {
    // Surat masuk
    case "INCOMING_LETTER_CREATE": return { verb: "mencatat surat masuk baru", object: obj };
    case "INCOMING_LETTER_UPDATE": return { verb: "mengubah data surat masuk", object: obj, extra: changedColumns(meta) };
    case "INCOMING_STATUS": return { verb: "mengubah status surat masuk", object: obj, extra: fromTo(meta) };
    // Surat keluar
    case "OUTGOING_LETTER_CREATE": return { verb: "membuat draft surat keluar", object: obj };
    case "OUTGOING_LETTER_UPDATE": return { verb: "mengubah draft surat keluar", object: obj, extra: changedColumns(meta) };
    case "OUTGOING_SUBMIT": return { verb: "mengajukan surat keluar untuk diperiksa", object: obj };
    case "OUTGOING_REVIEW": return { verb: "mulai meninjau surat keluar", object: obj };
    case "OUTGOING_REQUEST_REVISION": return { verb: "meminta surat keluar diperbaiki", object: obj };
    case "OUTGOING_APPROVE": return { verb: "menyetujui surat keluar", object: obj };
    case "OUTGOING_FINALIZE": return { verb: "memfinalkan surat keluar", object: obj, extra: meta.number ? `Nomor surat: ${String(meta.number)}.` : undefined };
    case "NUMBER_ALLOCATE": return { verb: "menerbitkan nomor untuk surat keluar", object: obj, extra: meta.number ? `Nomor: ${String(meta.number)}.` : undefined };
    case "OUTGOING_SEND": return { verb: "mencatat bahwa surat keluar sudah dikirim", object: obj, extra: meta.method ? `Dikirim melalui ${String(meta.method)}.` : undefined };
    case "OUTGOING_NEW_VERSION": return { verb: "membuka kembali surat keluar sebagai versi baru", object: obj, extra: meta.new_version ? `Sekarang versi ${String(meta.new_version)}.` : undefined };
    // Disposisi
    case "DISPOSITION_CREATE": return { verb: `membuat disposisi untuk ${String(meta.recipients ?? 1)} penerima pada surat`, object: obj, extra: meta.priority ? `Prioritas ${L(meta.priority).toLowerCase()}.` : undefined };
    case "DISPOSITION_STATUS": return { verb: "mengubah status disposisi pada surat", object: obj, extra: fromTo(meta) };
    // Arsip dan hapus
    case "ARCHIVE": return { verb: `mengarsipkan ${jenis}`, object: obj };
    case "UNARCHIVE": return { verb: `membatalkan pengarsipan ${jenis}`, object: obj, extra: reason(meta) };
    case "ARCHIVE_DELETE": return { verb: `menghapus ${jenis} dari arsip`, object: obj, extra: [meta.number ? `Nomor: ${String(meta.number)}.` : "", reason(meta) ?? ""].filter(Boolean).join(" ") || undefined };
    case "LETTER_DELETE": return { verb: `menghapus ${jenis}`, object: obj, extra: reason(meta) };
    // Lampiran
    case "ATTACHMENT_CREATE": return { verb: "mengunggah lampiran", object: obj };
    case "FILE_DOWNLOAD": return { verb: "mengunduh lampiran", object: obj };
    // Pengguna
    case "USER_UPDATE": {
      const parts: string[] = [];
      if (meta.role_from !== undefined && meta.role_from !== meta.role_to) parts.push(`peran diubah dari ${role(meta.role_from)} menjadi ${role(meta.role_to)}`);
      if (meta.active_from !== undefined && meta.active_from !== meta.active_to) parts.push(meta.active_to ? "akun diaktifkan" : "akun dinonaktifkan");
      return { verb: "memperbarui data pengguna", object: obj, extra: parts.length ? `${parts[0][0].toUpperCase()}${parts[0].slice(1)}${parts.length > 1 ? ", " + parts.slice(1).join(", ") : ""}.` : undefined };
    }
    case "USER_DELETE": return { verb: "menghapus akun", object: obj, extra: meta.role ? `Perannya: ${role(meta.role)}.` : undefined };
    case "USER_INVITE_RESEND": return { verb: "mengirim ulang undangan ke", object: meta.email ? { text: String(meta.email) } : obj };
    // Pengaturan
    case "SCHOOL_SETTINGS_UPDATE": return { verb: "mengubah pengaturan sekolah", extra: changedColumns(meta) };
    case "LETTER_TEMPLATE_CREATE": return { verb: "menambahkan template surat" };
    case "LETTER_TEMPLATE_UPDATE": return { verb: "mengubah template surat" };
    case "LETTER_CATEGORY_CREATE": return { verb: "menambahkan kategori surat" };
    case "LETTER_CATEGORY_UPDATE": return { verb: "mengubah kategori surat" };
    // Akun
    case "AUTH_LOGIN": return { verb: "masuk ke ARSIPERS" };
    case "AUTH_LOGIN_GOOGLE": return { verb: "masuk ke ARSIPERS dengan akun Google" };
    case "AUTH_LOGOUT": return { verb: "keluar dari ARSIPERS" };
    default: return { verb: `melakukan tindakan “${action.replaceAll("_", " ").toLowerCase()}”`, object: obj };
  }
}