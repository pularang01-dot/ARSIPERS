import { Field, Flash, inputClass, SubmitButton } from "@/components/ui";
import { firstParam } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { go } from "@/lib/flash";
import Link from "next/link";

export const metadata = { title: "Atur ulang kata sandi" };

async function requestReset(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  if (email) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${base}/auth/callback?next=/atur-password` });
  }
  // Pesan sama baik email terdaftar maupun tidak (cegah enumerasi akun)
  go("/lupa-password", "ok", "Jika email terdaftar, tautan pengaturan ulang telah dikirim.");
}

export default function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold text-navy-900">Atur ulang kata sandi</h1>
        <p className="mb-6 mt-1 text-sm text-ink-soft">Kami akan mengirim tautan ke email Anda.</p>
        <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />
        <form action={requestReset} className="space-y-4">
          <Field label="Email" htmlFor="email" required><input id="email" name="email" type="email" required className={inputClass} /></Field>
          <SubmitButton className="w-full">Kirim tautan</SubmitButton>
        </form>
        <p className="mt-4 text-sm"><Link href="/login" className="text-navy-700 underline underline-offset-2">Kembali ke halaman masuk</Link></p>
      </div>
    </main>
  );
}
