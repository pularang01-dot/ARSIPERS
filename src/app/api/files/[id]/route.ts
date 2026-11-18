import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Unduh lampiran: baris lampiran dibaca melalui RLS; tautan bertanda tangan hanya berlaku 60 detik. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new NextResponse("Tidak ditemukan", { status: 404 });
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new NextResponse("Tidak diizinkan", { status: 401 });
  const { data: a } = await sb.from("letter_attachments").select("id, storage_path, file_name").eq("id", params.id).maybeSingle();
  if (!a) return new NextResponse("Tidak ditemukan", { status: 404 });
  const { data, error } = await sb.storage.from("letter-files").createSignedUrl(a.storage_path, 60, { download: a.file_name });
  if (error || !data) return new NextResponse("Berkas tidak tersedia", { status: 404 });
  await sb.rpc("log_file_download", { p_attachment: a.id });
  const res = NextResponse.redirect(data.signedUrl, 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
