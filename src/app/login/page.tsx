import Image from "next/image";
import Link from "next/link";
import { signIn, signInWithGoogle } from "./actions";
import { buttonClass, Field, Flash, inputClass, SubmitButton } from "@/components/ui";
import { firstParam } from "@/lib/utils";
import { Copyright } from "@/components/Copyright";
import { InstallBanner, InstallButton } from "@/components/install";

export const metadata = { title: "Masuk" };

export default function LoginPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const error = firstParam(searchParams.error);
  const next = firstParam(searchParams.next);
  const sessionMsg = error === "sesi" ? "Sesi Anda berakhir atau akun tidak aktif. Silakan masuk kembali." : error;
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Panel merek */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 px-12 py-14 text-white lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden style={{ backgroundImage: "repeating-linear-gradient(135deg, #fff 0, #fff 1px, transparent 1px, transparent 16px)" }} />
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brass via-brass-soft to-brass" aria-hidden />
        <div className="relative flex flex-col items-center text-center">
          <div className="flex h-72 w-72 items-center justify-center rounded-full bg-white shadow-lift ring-4 ring-brass/70 ring-offset-4 ring-offset-navy-800">
            <Image src="/logo.png" alt="Lencana ARSIPERS SDN Pandian I Sumenep" width={512} height={528} priority className="h-auto w-[76%]" />
          </div>
          <h1 className="mt-10 max-w-md font-display text-[34px] font-semibold leading-tight tracking-tight">Sistem Persuratan dan Kearsipan</h1>
          <p className="mt-2 text-lg text-brass-soft">SDN Pandian I Sumenep</p>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-2.5 text-sm" aria-label="Prinsip layanan">
            {["Digital", "Tertib", "Terpercaya"].map((t) => <li key={t} className="rounded-full border border-white/25 bg-white/5 px-4 py-1.5 font-medium tracking-wide">{t}</li>)}
          </ul>
        </div>
        <p className="absolute bottom-6 text-xs text-navy-100/60">Akun dibuat oleh administrator sekolah.</p>
      </section>

      {/* Formulir */}
      <section className="relative flex items-center justify-center px-5 py-12">
        <div className="absolute right-4 top-4"><InstallButton /></div>
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <Image src="/logo-256.png" alt="Lencana ARSIPERS SDN Pandian I Sumenep" width={256} height={264} priority className="h-24 w-auto" />
            <p className="mt-3 text-sm font-semibold tracking-[0.14em] text-navy-900">ARSIPERS</p>
            <p className="text-xs text-ink-soft">SDN Pandian I Sumenep</p>
          </div>
          <InstallBanner className="mb-6" />
          <h2 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-navy-900">Masuk ke ARSIPERS</h2>
          <p className="mb-6 mt-1.5 text-sm text-ink-soft">Gunakan akun yang didaftarkan administrator sekolah.</p>
          <Flash error={sessionMsg} ok={firstParam(searchParams.ok)} />

          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <button type="submit" className={buttonClass("secondary", "w-full")}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.5-4.1 7-10.2 7-17.6z" /><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.9-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>
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
          <Copyright className="mt-12 text-center" />
        </div>
      </section>
    </main>
  );
}