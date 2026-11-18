import { Field, Flash, inputClass, SubmitButton } from "@/components/ui";
import { firstParam } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { go } from "@/lib/flash";
import { redirect } from "next/navigation";

export const metadata = { title: "Atur kata sandi" };

async function setPassword(formData: FormData) {
  "use server";
  const p1 = String(formData.get("password") ?? "");
  const p2 = String(formData.get("confirm") ?? "");
  if (p1.length < 10) go("/atur-password", "error", "Kata sandi minimal 10 karakter");
  if (p1 !== p2) go("/atur-password", "error", "Konfirmasi kata sandi tidak sama");
  const { error } = await createClient().auth.updateUser({ password: p1 });
  if (error) go("/atur-password", "error", "Kata sandi tidak dapat diperbarui. Minta tautan baru.");
  go("/", "ok", "Kata sandi berhasil diperbarui");
}

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) redirect("/login?error=" + encodeURIComponent("Tautan tidak valid atau kedaluwarsa"));
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold text-navy-900">Buat kata sandi baru</h1>
        <p className="mb-6 mt-1 text-sm text-ink-soft">Gunakan minimal 10 karakter.</p>
        <Flash error={firstParam(searchParams.error)} />
        <form action={setPassword} className="space-y-4">
          <Field label="Kata sandi baru" htmlFor="password" required><input id="password" name="password" type="password" minLength={10} required autoComplete="new-password" className={inputClass} /></Field>
          <Field label="Ulangi kata sandi" htmlFor="confirm" required><input id="confirm" name="confirm" type="password" minLength={10} required autoComplete="new-password" className={inputClass} /></Field>
          <SubmitButton className="w-full">Simpan kata sandi</SubmitButton>
        </form>
      </div>
    </main>
  );
}
