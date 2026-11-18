import { signIn, signInWithGoogle } from "./actions";
import { buttonClass, Field, Flash, inputClass, SubmitButton } from "@/components/ui";
import { firstParam } from "@/lib/utils";
import Link from "next/link";

export const metadata = { title: "Masuk" };

export default function LoginPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const error = firstParam(searchParams.error);
  const next = firstParam(searchParams.next);
  const sessionMsg = error === "sesi" ? "Sesi Anda berakhir atau akun tidak aktif. Silakan masuk kembali." : error;
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden flex-col justify-between bg-navy-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white font-display font-bold text-navy-900" aria-hidden>A</span>
          <span className="text-lg font-semibold tracking-wide">ARSIPERS</span>
        </div>
        <div>
          <h1 className="font-display text-4xl font-semibold leading-tight">Setiap surat tercatat, ditelusuri, dan tersimpan.</h1>
          <p className="mt-4 max-w-md text-navy-100/80">Sistem persuratan dan kearsipan SDN Pandian I Sumenep: dari surat diterima hingga arsip, lengkap dengan jejak aktivitas.</p>
        </div>
        <p className="text-xs text-navy-100/60">Akun dibuat oleh administrator sekolah.</p>
      </section>
      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-2xl font-semibold text-navy-900">Masuk ke ARSIPERS</h2>
          <p className="mb-6 mt-1 text-sm text-ink-soft">Gunakan email dan kata sandi yang diberikan administrator.</p>
          <Flash error={sessionMsg} ok={firstParam(searchParams.ok)} />
          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <button type="submit" className={buttonClass("secondary", "w-full")}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.5-4.1 7-10.2 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.9-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
              Masuk dengan Google
            </button>
          </form>
          <p className="mt-2 text-xs text-ink-mute">Gunakan akun Google dengan alamat email yang diundang administrator.</p>
          <div className="my-5 flex items-center gap-3 text-xs text-ink-mute" role="separator"><span className="h-px flex-1 bg-line" />atau dengan email<span className="h-px flex-1 bg-line" /></div>
          <form action={signIn} className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <Field label="Email" htmlFor="email" required><input id="email" name="email" type="email" required autoComplete="username" className={inputClass} /></Field>
            <Field label="Kata sandi" htmlFor="password" required><input id="password" name="password" type="password" required autoComplete="current-password" className={inputClass} /></Field>
            <SubmitButton className="w-full">Masuk</SubmitButton>
          </form>
          <p className="mt-4 text-sm"><Link href="/lupa-password" className="text-navy-700 underline underline-offset-2">Lupa kata sandi?</Link></p>
        </div>
      </section>
    </main>
  );
}