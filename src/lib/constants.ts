export const INCOMING_STATUS = ["DITERIMA","DICATAT","DIVERIFIKASI","MENUNGGU_DISPOSISI","DITINDAKLANJUTI","SELESAI","DIARSIPKAN"] as const;
export const OUTGOING_STATUS = ["DRAFT","DIAJUKAN","DITINJAU","PERLU_REVISI","DISETUJUI","FINAL","DIKIRIM","DIARSIPKAN"] as const;
export const DISPOSITION_STATUS = ["MENUNGGU","DITERIMA","DALAM_PROSES","SELESAI"] as const;
export const NATURES = ["BIASA","PENTING","SEGERA","RAHASIA"] as const;
export const PRIORITIES = ["RENDAH","NORMAL","TINGGI","MENDESAK"] as const;

export const STATUS_LABEL: Record<string, string> = {
  DITERIMA: "Diterima", DICATAT: "Dicatat", DIVERIFIKASI: "Diverifikasi", MENUNGGU_DISPOSISI: "Menunggu disposisi",
  DITINDAKLANJUTI: "Ditindaklanjuti", SELESAI: "Selesai", DIARSIPKAN: "Diarsipkan",
  DRAFT: "Draft", DIAJUKAN: "Diajukan", DITINJAU: "Ditinjau", PERLU_REVISI: "Perlu revisi", DISETUJUI: "Disetujui",
  FINAL: "Final", DIKIRIM: "Dikirim",
  MENUNGGU: "Menunggu", DALAM_PROSES: "Dalam proses",
  BIASA: "Biasa", PENTING: "Penting", SEGERA: "Segera", RAHASIA: "Rahasia",
  RENDAH: "Rendah", NORMAL: "Normal", TINGGI: "Tinggi", MENDESAK: "Mendesak",
};

export type Tone = "ok" | "warn" | "bad" | "info" | "idle";
export const STATUS_TONE: Record<string, Tone> = {
  DITERIMA: "info", DICATAT: "info", DIVERIFIKASI: "info", MENUNGGU_DISPOSISI: "warn", DITINDAKLANJUTI: "info", SELESAI: "ok", DIARSIPKAN: "idle",
  DRAFT: "idle", DIAJUKAN: "warn", DITINJAU: "info", PERLU_REVISI: "bad", DISETUJUI: "ok", FINAL: "ok", DIKIRIM: "ok",
  MENUNGGU: "warn", DALAM_PROSES: "info",
  BIASA: "idle", PENTING: "warn", SEGERA: "bad", RAHASIA: "bad",
  RENDAH: "idle", NORMAL: "info", TINGGI: "warn", MENDESAK: "bad",
};

export const INCOMING_STEPS = ["DICATAT","DIVERIFIKASI","MENUNGGU_DISPOSISI","DITINDAKLANJUTI","SELESAI","DIARSIPKAN"];
export const OUTGOING_STEPS = ["DRAFT","DIAJUKAN","DITINJAU","DISETUJUI","FINAL","DIKIRIM","DIARSIPKAN"];

export const PAGE_SIZE = 15;

export const AUDIT_LABEL: Record<string, string> = {
  INCOMING_LETTER_CREATE: "Surat masuk dicatat", INCOMING_LETTER_UPDATE: "Data surat masuk diubah", INCOMING_STATUS: "Status surat masuk diperbarui",
  OUTGOING_LETTER_CREATE: "Draft surat keluar dibuat", OUTGOING_LETTER_UPDATE: "Draft surat keluar diubah",
  OUTGOING_SUBMIT: "Surat keluar diajukan", OUTGOING_REVIEW: "Surat keluar ditinjau", OUTGOING_REQUEST_REVISION: "Revisi surat diminta",
  OUTGOING_APPROVE: "Surat keluar disetujui", OUTGOING_FINALIZE: "Surat difinalkan", NUMBER_ALLOCATE: "Nomor surat diterbitkan",
  OUTGOING_SEND: "Surat keluar dikirim", OUTGOING_NEW_VERSION: "Versi baru surat dibuat",
  DISPOSITION_CREATE: "Disposisi dibuat", DISPOSITION_STATUS: "Disposisi diperbarui", ARCHIVE: "Surat diarsipkan", UNARCHIVE: "Pengarsipan dibatalkan", ARCHIVE_DELETE: "Arsip dihapus", SIGNATORY_CREATE: "Penandatangan didaftarkan", SIGNATURE_IMAGE_ADD: "Gambar tanda tangan diganti", SIGNATORY_END: "Masa jabatan penandatangan diakhiri", SIGNATORY_REVOKE: "Penandatangan dicabut", SIGNATURE_APPLY: "Tanda tangan digital dibubuhkan", SIGNATURE_WITHDRAW: "Tanda tangan digital ditarik", TEST_DATA_PURGE: "Data uji coba dihapus", LETTER_DELETE: "Surat dihapus",
  USER_UPDATE: "Pengguna diperbarui", USER_DELETE: "Pengguna dihapus", USER_INVITE_RESEND: "Undangan dikirim ulang",
  SCHOOL_SETTINGS_UPDATE: "Pengaturan sekolah diubah", LETTER_TEMPLATE_CREATE: "Template dibuat", LETTER_TEMPLATE_UPDATE: "Template diubah",
  LETTER_CATEGORY_CREATE: "Kategori ditambahkan", LETTER_CATEGORY_UPDATE: "Kategori diubah", ATTACHMENT_CREATE: "Lampiran diunggah",
  AUTH_LOGIN: "Login", AUTH_LOGIN_GOOGLE: "Login Google", AUTH_LOGOUT: "Logout", FILE_DOWNLOAD: "Berkas diunduh",
};
export const auditLabel = (a: string) => AUDIT_LABEL[a] ?? a.replaceAll("_", " ").toLowerCase();

export const DISPOSITION_STEPS = ["MENUNGGU", "DITERIMA", "DALAM_PROSES", "SELESAI"];
export const NATURE_HINT: Record<string, string> = {
  BIASA: "Surat rutin", PENTING: "Perlu perhatian", SEGERA: "Perlu tindakan cepat", RAHASIA: "Akses terbatas",
};