import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, Field, Flash, inputClass, PageHeader, StatusBadge, SubmitButton, tableClass } from "@/components/ui";
import { ROLES, ROLE_LABEL } from "@/lib/permissions";
import { firstParam } from "@/lib/utils";
import { deleteUser, inviteUser, resendInvite, updateUser } from "@/features/admin-actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { createAdminClient } from "@/lib/supabase/admin";
import { buttonClass } from "@/components/ui";

export const metadata = { title: "Pengguna" };

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const s = await requirePermission("users.manage");
  const { data } = await createClient().from("profiles").select("id, full_name, role_code, is_active").order("full_name");
  // Email dan status masuk berasal dari Supabase Auth (butuh service role; bila belum diatur, kolom ini disembunyikan)
  let info: Record<string, { email: string; signedIn: boolean }> = {};
  try {
    const { data: au } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 200 });
    info = Object.fromEntries((au?.users ?? []).map((u) => [u.id, { email: u.email ?? "", signedIn: !!u.last_sign_in_at }]));
  } catch { /* abaikan */ }
  const roleSelect = (name: string, val?: string, disabled?: boolean) => (
    <select name={name} defaultValue={val ?? "GURU"} disabled={disabled} aria-label="Role" className={inputClass}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
  );
  return (
    <>
      <PageHeader title="Pengguna" description="Hanya email yang didaftarkan di sini yang dapat masuk. Role menentukan akses; ubah dengan hati-hati." />
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />
      <Card title="Tambah pengguna" className="mb-6">
        <form action={inviteUser} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nama lengkap" htmlFor="full_name" required><input id="full_name" name="full_name" required className={inputClass} /></Field>
            <Field label="Email" htmlFor="email" required hint="Untuk login Google, gunakan alamat email Google pengguna."><input id="email" name="email" type="email" required className={inputClass} /></Field>
            <Field label="Role" htmlFor="role" required><select id="role" name="role" defaultValue="GURU" className={inputClass}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton name="mode" value="email">Kirim undangan email</SubmitButton>
            <SubmitButton name="mode" value="google" variant="secondary">Daftarkan untuk login Google (tanpa email)</SubmitButton>
          </div>
          <p className="text-xs text-ink-mute">Undangan email: pengguna membuat kata sandi lewat tautan, dan tetap boleh memakai Google. Tanpa email: akun langsung aktif dan pengguna cukup memilih Masuk dengan Google.</p>
        </form>
      </Card>
      <Card title="Daftar pengguna">
        {!data?.length ? <EmptyState title="Belum ada pengguna" /> : (
          <div className={tableClass.wrap}><table className="w-full min-w-[900px] text-left text-sm">
            <thead><tr><th scope="col" className={tableClass.th}>Nama</th><th scope="col" className={tableClass.th}>Role</th><th scope="col" className={tableClass.th}>Aktif</th><th scope="col" className={tableClass.th}><span className="sr-only">Simpan</span></th></tr></thead>
            <tbody>{data.map((u: any) => {
              const self = u.id === s.userId;
              return (<tr key={u.id}><td colSpan={4} className="border-b border-line p-0">
                <form action={updateUser} className="grid grid-cols-[1.4fr_1fr_auto_auto_auto_auto] items-center gap-3 px-4 py-3"><input type="hidden" name="id" value={u.id} />
                  <div><label className="sr-only" htmlFor={`n-${u.id}`}>Nama</label><input id={`n-${u.id}`} name="full_name" defaultValue={u.full_name} required className={inputClass} />{info[u.id] && <p className="mt-1 break-all text-xs text-ink-mute">{info[u.id].email} - {info[u.id].signedIn ? "sudah pernah masuk" : "belum pernah masuk"}</p>}{self && <p className="mt-1 text-xs text-ink-mute">Akun Anda: role dan status tidak dapat diubah sendiri.</p>}</div>
                  <div>{self ? <><input type="hidden" name="role" value={u.role_code} />{roleSelect("role_view", u.role_code, true)}</> : roleSelect("role", u.role_code)}</div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={u.is_active} disabled={self} className="h-4 w-4" />{self && <input type="hidden" name="active" value="true" />}<StatusBadge value={u.is_active ? "SELESAI" : "DRAFT"} tone={u.is_active ? "ok" : "idle"} /></label>
                  <SubmitButton variant="secondary">Simpan</SubmitButton>
                  {self ? <><span /><span /></> : <button type="submit" formAction={resendInvite} formNoValidate disabled={!u.is_active} title={u.is_active ? "Kirim ulang undangan ke email pengguna" : "Aktifkan pengguna terlebih dahulu"} className={buttonClass("ghost", "px-3 text-xs")}>Kirim ulang</button>}
                  {!self && (
                    <ConfirmButton label="Hapus" title={`Hapus akun ${u.full_name || "pengguna"}?`} confirmLabel="Hapus akun" formAction={deleteUser}
                      message="Penghapusan permanen dan tidak dapat dibatalkan. Hanya akun yang belum memiliki riwayat yang bisa dihapus; jika sudah ada riwayat, gunakan Nonaktifkan.">
                      <Field label="Ketik HAPUS untuk konfirmasi" htmlFor={`c-${u.id}`}><input id={`c-${u.id}`} name="confirm" autoComplete="off" className={inputClass} /></Field>
                    </ConfirmButton>
                  )}</form></td></tr>);
            })}</tbody>
          </table></div>
        )}
      </Card>
    </>
  );
}