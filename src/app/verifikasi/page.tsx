import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Field, inputClass, SubmitButton } from "@/components/ui";
import { Stamp } from "@/components/register";
import { Copyright } from "@/components/Copyright";
import { firstParam, formatDate, formatDateTime } from "@/lib/utils";
import { formatCode, VERIFY_STATE_LABEL } from "@/lib/signature";

export const metadata = { title: "Verifikasi tanda tangan", robots: { index: false, follow: false } };
type Row = Record<string, any>;

const TONE: Record<string, "ok" | "bad" | "warn" | "idle"> = { SAH: "ok", DITARIK: "bad", DIGANTI: "warn", UJI_COBA: "warn" };
const NOTE: Record<string, string> = {
  SAH: "Tanda tangan digital ini tercatat sah pada surat di bawah.",
  DITARIK: "Tanda tangan digital ini telah ditarik oleh penerbitnya dan tidak berlaku.",
  DIGANTI: "Surat ini telah direvisi setelah ditandatangani. Tanda tangan ini hanya berlaku untuk versi sebelumnya.",
  UJI_COBA: "Surat ini dibuat dalam mode uji coba dan bukan surat resmi.",
};

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const kode = firstParam(searchParams.kode).trim();
  let result: Row | null = null; let searched = false;
  if (kode) {
    searched = true;
    const { data } = await createClient().rpc("verify_signature", { p_code: kode });
    result = ((data ?? []) as Row[])[0] ?? null;
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-12">
      <div className="mb-8 flex flex-col items-center text-center">
        <Image src="/logo-256.png" alt="Lencana ARSIPERS" width={256} height={264} priority className="h-20 w-auto" />
        <h1 className="mt-4 font-display text-[28px] font-semibold tracking-tight text-navy-900">Verifikasi tanda tangan digital</h1>
        <p className="mt-1 text-sm text-ink-soft">Masukkan kode verifikasi 12 karakter yang tercetak di bawah tanda tangan pada surat.</p>
      </div>

      <form className="flex items-end gap-3 rounded-xl border border-line bg-surface-card p-5 shadow-card" role="search">
        <div className="flex-1"><Field label="Kode verifikasi" htmlFor="kode"><input id="kode" name="kode" defaultValue={kode} autoComplete="off" spellCheck={false} placeholder="mis. A1B2-C3D4-E5F6" className={inputClass + " font-mono uppercase"} /></Field></div>
        <SubmitButton>Periksa</SubmitButton>
      </form>

      {searched && (
        <section aria-live="polite" className="mt-6 rounded-xl border border-line bg-surface-card p-6 shadow-card">
          {result ? (
            <>
              <div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold text-navy-900">Hasil pemeriksaan</h2><Stamp tone={TONE[result.state as string] ?? "idle"}>{VERIFY_STATE_LABEL[result.state as string] ?? result.state}</Stamp></div>
              <p className="mt-2 text-sm text-ink-soft">{NOTE[result.state as string]}</p>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-ink-mute">Nomor surat</dt><dd className="mt-0.5 font-medium tabular-nums">{(result.letter_number as string) ?? "-"}</dd></div>
                <div><dt className="text-xs text-ink-mute">Tanggal surat</dt><dd className="mt-0.5">{formatDate(result.letter_date as string)}</dd></div>
                <div><dt className="text-xs text-ink-mute">Ditandatangani oleh</dt><dd className="mt-0.5">{result.signer_name as string}, {result.signer_position as string}</dd></div>
                <div><dt className="text-xs text-ink-mute">Waktu penandatanganan</dt><dd className="mt-0.5">{formatDateTime(result.signed_at as string)}</dd></div>
              </dl>
              <p className="mt-5 text-xs text-ink-mute">Kode: {formatCode(kode)}. Isi surat tidak ditampilkan di halaman ini. Cocokkan nomor dan tanggal dengan surat di tangan Anda.</p>
            </>
          ) : (
            <><h2 className="font-display text-xl font-semibold text-navy-900">Kode tidak ditemukan</h2><p className="mt-2 text-sm text-ink-soft">Periksa kembali penulisan kode. Kode terdiri dari 12 huruf/angka (A sampai F dan 0 sampai 9). Bila kode benar tetapi tidak ditemukan, surat mungkin tidak dibuat melalui ARSIPERS.</p></>
          )}
        </section>
      )}
      <div className="mt-10 text-center"><Copyright /></div>
    </main>
  );
}