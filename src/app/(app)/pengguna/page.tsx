import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, Field, Flash, inputClass, PageHeader, StatusBadge, SubmitButton, tableClass } from "@/components/ui";
import { ROLES, ROLE_LABEL } from "@/lib/permissions";
import { firstParam } from "@/lib/utils";
import { inviteUser, updateUser } from "@/features/admin-actions";

export const metadata = { title: "Pengguna" };

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const s = await requirePermission("users.manage");
  const { data } = await createClient().from("profiles").select("id, full_name, role_code, is_active").order("full_name");
  const roleSelect = (name: string, val?: string, disabled?: boolean) => (
    <select name={name} defaultValue={val ?? "GURU"} disabled={disabled} aria-label="Role" className={inputClass}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
  );
  return (
    <>
      <PageHeader title="Pengguna" description="Akun dibuat lewat undangan email. Role menentukan akses; ubah dengan hati-hati." />
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />
      <Card title="Undang pengguna" className="mb-6">
        <form action={inviteUser} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1fr_auto] lg:items-end">
          <Field label="Nama lengkap" htmlFor="full_name" required><input id="full_name" name="full_name" required className={inputClass} /></Field>
          <Field label="Email" htmlFor="email" required><input id="email" name="email" type="email" required className={inputClass} /></Field>
          <Field label="Role" htmlFor="role" required><select id="role" name="role" defaultValue="GURU" className={inputClass}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></Field>
          <SubmitButton>Kirim undangan</SubmitButton>
        </form>
      </Card>
      <Card title="Daftar pengguna">
        {!data?.length ? <EmptyState title="Belum ada pengguna" /> : (
          <div className={tableClass.wrap}><table className="w-full min-w-[720px] text-left text-sm">
            <thead><tr><th scope="col" className={tableClass.th}>Nama</th><th scope="col" className={tableClass.th}>Role</th><th scope="col" className={tableClass.th}>Aktif</th><th scope="col" className={tableClass.th}><span className="sr-only">Simpan</span></th></tr></thead>
            <tbody>{data.map((u: any) => {
              const self = u.id === s.userId;
              return (<tr key={u.id}><td colSpan={4} className="border-b border-line p-0">
                <form action={updateUser} className="grid grid-cols-[1.4fr_1fr_auto_auto] items-center gap-3 px-4 py-3"><input type="hidden" name="id" value={u.id} />
                  <div><label className="sr-only" htmlFor={`n-${u.id}`}>Nama</label><input id={`n-${u.id}`} name="full_name" defaultValue={u.full_name} required className={inputClass} />{self && <p className="mt-1 text-xs text-ink-mute">Akun Anda: role dan status tidak dapat diubah sendiri.</p>}</div>
                  <div>{self ? <><input type="hidden" name="role" value={u.role_code} />{roleSelect("role_view", u.role_code, true)}</> : roleSelect("role", u.role_code)}</div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={u.is_active} disabled={self} className="h-4 w-4" />{self && <input type="hidden" name="active" value="true" />}<StatusBadge value={u.is_active ? "SELESAI" : "DRAFT"} tone={u.is_active ? "ok" : "idle"} /></label>
                  <SubmitButton variant="secondary">Simpan</SubmitButton></form></td></tr>);
            })}</tbody>
          </table></div>
        )}
      </Card>
    </>
  );
}
