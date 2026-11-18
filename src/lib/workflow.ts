/** Cerminan aturan transisi di database (0004_rpc.sql). Database tetap menjadi sumber kebenaran. */
export const INCOMING_TRANSITIONS: Record<string, string[]> = {
  DITERIMA: ["DICATAT"],
  DICATAT: ["DIVERIFIKASI"],
  DIVERIFIKASI: ["MENUNGGU_DISPOSISI", "DITINDAKLANJUTI", "SELESAI"],
  MENUNGGU_DISPOSISI: ["DITINDAKLANJUTI"],
  DITINDAKLANJUTI: ["SELESAI"],
  SELESAI: [],
  DIARSIPKAN: [],
};

export const DISPOSITION_TRANSITIONS: Record<string, string[]> = {
  MENUNGGU: ["DITERIMA"],
  DITERIMA: ["DALAM_PROSES", "SELESAI"],
  DALAM_PROSES: ["SELESAI"],
  SELESAI: [],
};

export type OutgoingAction = "SUBMIT" | "REVIEW" | "REQUEST_REVISION" | "APPROVE";
export const OUTGOING_ACTIONS: Record<OutgoingAction, { from: string[]; to: string }> = {
  SUBMIT: { from: ["DRAFT", "PERLU_REVISI"], to: "DIAJUKAN" },
  REVIEW: { from: ["DIAJUKAN"], to: "DITINJAU" },
  REQUEST_REVISION: { from: ["DIAJUKAN", "DITINJAU"], to: "PERLU_REVISI" },
  APPROVE: { from: ["DITINJAU"], to: "DISETUJUI" },
};

export function canTransitionIncoming(from: string, to: string): boolean {
  return (INCOMING_TRANSITIONS[from] ?? []).includes(to);
}
export function canTransitionDisposition(from: string, to: string): boolean {
  return (DISPOSITION_TRANSITIONS[from] ?? []).includes(to);
}
export function canOutgoingAction(from: string, action: OutgoingAction): boolean {
  return OUTGOING_ACTIONS[action].from.includes(from);
}
export const OUTGOING_EDITABLE = ["DRAFT", "PERLU_REVISI"];
export const INCOMING_EDITABLE = ["DITERIMA", "DICATAT", "DIVERIFIKASI"];
