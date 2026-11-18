import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { csvCell } from "@/lib/utils";

const MAX_ROWS = 5000;

export async function GET(req: NextRequest) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new NextResponse("Tidak diizinkan", { status: 401 });
  const { data: ok } = await sb.from("profiles").select("role_code").eq("id", user.id).eq("is_active", true).maybeSingle();
  const { data: perm } = ok ? await sb.from("role_permissions").select("permission_code").eq("role_code", ok.role_code).eq("permission_code", "reports.view").maybeSingle() : { data: null };
  if (!perm) return new NextResponse("Akses ditolak", { status: 403 });

  const sp = req.nextUrl.searchParams;
  const jenis = sp.get("jenis") === "keluar" ? "keluar" : "masuk";
  const from = /^\d{4}-\d{2}-\d{2}$/.test(sp.get("from") ?? "") ? sp.get("from")! : "1900-01-01";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(sp.get("to") ?? "") ? sp.get("to")! : "2999-12-31";

  let lines: string[];
  if (jenis === "masuk") {
    const { data } = await sb.from("incoming_letters").select("external_number, letter_date, received_date, sender, origin_org, subject, nature, status").gte("received_date", from).lte("received_date", to).order("received_date").limit(MAX_ROWS);
    lines = [["Nomor surat", "Tanggal surat", "Tanggal diterima", "Pengirim", "Instansi", "Perihal", "Sifat", "Status"].map(csvCell).join(",")]
      .concat((data ?? []).map((r: any) => [r.external_number, r.letter_date, r.received_date, r.sender, r.origin_org, r.subject, r.nature, r.status].map(csvCell).join(",")));
  } else {
    const { data } = await sb.from("outgoing_letters").select("number, letter_date, recipient, subject, nature, status, version").gte("letter_date", from).lte("letter_date", to).order("letter_date").limit(MAX_ROWS);
    lines = [["Nomor surat", "Tanggal surat", "Tujuan", "Perihal", "Sifat", "Status", "Versi"].map(csvCell).join(",")]
      .concat((data ?? []).map((r: any) => [r.number, r.letter_date, r.recipient, r.subject, r.nature, r.status, r.version].map(csvCell).join(",")));
  }
  return new NextResponse("\uFEFF" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="laporan-surat-${jenis}.csv"`, "Cache-Control": "private, no-store" },
  });
}
