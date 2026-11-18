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
