import { z } from "zod";
import { NATURES, PRIORITIES } from "@/lib/constants";

const text = (min: number, max: number, label: string) =>
  z.string({ required_error: `${label} wajib diisi` }).trim().min(min, `${label} wajib diisi`).max(max, `${label} terlalu panjang`);
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid");
const uuid = z.string().uuid("ID tidak valid");

export const incomingSchema = z
  .object({
    external_number: optionalText(100),
    letter_date: dateStr,
    received_date: dateStr,
    sender: text(2, 200, "Pengirim"),
    origin_org: optionalText(200),
    subject: text(3, 300, "Perihal"),
    category_id: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
    classification: optionalText(100),
    nature: z.enum(NATURES),
    summary: optionalText(2000),
    needs_disposition: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  })
  .refine((d) => d.received_date >= d.letter_date, { path: ["received_date"], message: "Tanggal diterima tidak boleh sebelum tanggal surat" })
  .refine((d) => d.received_date <= new Date(Date.now() + 86400000).toISOString().slice(0, 10), { path: ["received_date"], message: "Tanggal diterima tidak boleh di masa depan" });

export const outgoingSchema = z.object({
  recipient: text(2, 300, "Tujuan surat"),
  subject: text(3, 300, "Perihal"),
  body: z.string().max(20000, "Isi surat terlalu panjang").default(""),
  letter_date: dateStr,
  letter_type: text(2, 50, "Jenis surat").default("UMUM"),
  category_id: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
  template_id: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
  attachment_note: optionalText(300),
  nature: z.enum(NATURES),
});

export const dispositionSchema = z.object({
  incoming_id: uuid,
  assignees: z.array(uuid).min(1, "Pilih minimal satu penerima").max(20),
  instruction: text(3, 2000, "Instruksi"),
  priority: z.enum(PRIORITIES),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((v) => v || null),
});

export const respondSchema = z.object({
  id: uuid,
  to: z.enum(["DITERIMA", "DALAM_PROSES", "SELESAI"]),
  note: z.string().trim().max(2000).optional(),
});

export const settingsSchema = z.object({
  name: optionalText(200), npsn: optionalText(20), address: optionalText(500), phone: optionalText(50),
  email: z.string().trim().email("Email tidak valid").optional().or(z.literal("")).transform((v) => v || null),
  principal_name: optionalText(200), principal_nip: optionalText(30), letterhead_note: optionalText(500),
  letterhead_parent: optionalText(120), letter_city: optionalText(60), letterhead_rule: z.enum(["THICK", "DOUBLE", "NONE"]).default("THICK"),
  number_format: z.string().trim().max(120).optional().transform((v) => v || null),
  number_seq_pad: z.coerce.number().int().min(1).max(8),
  number_reset: z.enum(["YEARLY", "MONTHLY", "NEVER"]),
});

export const userSchema = z.object({
  id: uuid,
  full_name: text(2, 200, "Nama"),
  role: z.enum(["SUPER_ADMIN", "KEPALA_SEKOLAH", "OPERATOR_TU", "GURU", "KOORDINATOR", "ARSIPARIS"]),
  active: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export const inviteSchema = z.object({
  email: z.string().trim().email("Email tidak valid"),
  full_name: text(2, 200, "Nama"),
  role: userSchema.shape.role,
});

export function zodFlat(e: z.ZodError): string {
  return e.issues.map((i) => i.message).join("; ");
}