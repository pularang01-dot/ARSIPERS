import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildLetterPdf } from "@/lib/pdf";
import { formatDate, safeFileName } from "@/lib/utils";

/** PDF dibuat dari snapshot versi yang difinalkan (letter_versions), bukan dari draf yang bisa berubah. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new NextResponse("Tidak ditemukan", { status: 404 });
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new NextResponse("Tidak diizinkan", { status: 401 });
  const { data: l } = await sb.from("outgoing_letters").select("id, number, status, version, nature, is_test").eq("id", params.id).maybeSingle();
  if (!l) return new NextResponse("Tidak ditemukan", { status: 404 });
  if (!["FINAL", "DIKIRIM", "DIARSIPKAN"].includes(l.status) || !l.number) return new NextResponse("PDF hanya tersedia untuk surat final", { status: 409 });
  const { data: v } = await sb.from("letter_versions").select("snapshot").eq("outgoing_letter_id", l.id).eq("version", l.version).maybeSingle();
  if (!v) return new NextResponse("Versi final tidak ditemukan", { status: 404 });
  const { data: school } = await sb.from("school_settings").select("name, address, phone, email, principal_name, principal_nip, letterhead_note, letterhead_parent, letterhead_rule, letter_city, logo_data, logo_mime").eq("id", 1).maybeSingle();
  const snap = v.snapshot as { number: string; recipient: string; subject: string; body: string; letter_date: string; nature: string; attachment_note: string | null; letter_type?: string | null };
  // Tanda tangan digital (bila ada) dan watermark untuk surat uji coba
  const { data: sigRows } = await sb.rpc("get_letter_signature", { p_letter: l.id, p_include_image: true });
  const sg = ((sigRows ?? []) as Record<string, any>[])[0];
  const signature = sg ? {
    signer_name: sg.signer_name as string, signer_nip: sg.signer_nip as string | null, signer_position: sg.signer_position as string | null,
    image_data: sg.image_data as string | null, image_mime: sg.image_mime as string | null, code: sg.code as string,
    signed_at_label: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date(sg.signed_at as string)).replace(".", ".") + " WIB",
    state: (sg.state === "VALID" ? "VALID" : "WITHDRAWN") as "VALID" | "WITHDRAWN",
  } : null;
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const bytes = await buildLetterPdf(snap, school ?? {}, formatDate(snap.letter_date), { signature, watermark: l.is_test ? "UJI COBA" : null, verifyUrl: base ? `${base}/verifikasi` : null });
  return new NextResponse(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${safeFileName("surat-" + l.number.replace(/\//g, "-"))}.pdf"`, "Cache-Control": "private, no-store" },
  });
}