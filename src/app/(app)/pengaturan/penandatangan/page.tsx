import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, Field, Flash, inputClass, PageHeader, SubmitButton } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { FileInput } from "@/components/FileInput";
import { Stamp } from "@/components/register";
import { createSignatory, endSignatory, replaceSignatureImage, revokeSignatory } from "@/features/signature-actions";
import { firstParam, formatDate, todayJakarta } from "@/lib/utils";
import { ROLE_LABEL, type RoleCode } from "@/lib/permissions";

export const metadata = { title: "Penandatangan" };
type Row = Record<string, any>;

function effective(s: Row, today: string): { label: string; tone: "ok" | "warn" | "bad" | "idle" } {
  if (s.status === "REVOKED") return { label: "Dicabut", tone: "bad" };
  if (s.status === "ENDED") return { label: "Berakhir", tone: "idle" };
  if (s.valid_from > today) return { label: "Belum berlaku", tone: "warn" };
  if (s.valid_until && s.valid_until < today) return { label: "Masa habis", tone: "idle" };
  return { label: "Berlaku", tone: "ok" };
}

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await requirePermission("signatures.manage");
  const sb = createClient();
  const today = todayJakarta();
  const [sg, imgs, sigs, people] = await Promise.all([
    sb.from("signatories").select("id, profile_id, full_name, nip, position, valid_from, valid_until, status, end_reason, ended_at").order("valid_from", { ascending: false }),
    sb.from("signature_images").select("id, signatory_id, version, image_data, image_mime").order("version", { ascending: false }),
    sb.from("letter_signatures").select("signatory_id, status").limit(10000),
    sb.from("profiles").select("id, full_name, role_code").eq("is_active", true).order("full_name"),
  ]);
  const rows = (sg.data ?? []) as Row[];
  const latest = new Map<string, Row>();
  ((imgs.data ?? []) as Row[]).forEach((i) => { if (!latest.has(i.signatory_id)) latest.set(i.signatory_id, i); });
  const counts = new Map<string, { valid: number; withdrawn: number }>();
  ((sigs.data ?? []) as Row[]).forEach((x) => { const c = counts.get(x.signatory_id) ?? { valid: 0, withdrawn: 0 }; if (x.status === "VALID") c.valid++; else c.withdrawn++; counts.set(x.signatory_id, c); });
  const accounts = (people.data ?? []) as Row[];
  const nameOf = new Map(accounts.map((a) => [a.id as string, a.full_name as string]));

  return (
    <div className="space-y-6">
      <PageHeader title="Penandatangan" crumbs={[{ label: "Pengaturan", href: "/pengaturan" }, { label: "Penandatangan" }]}
        description="Daftar pejabat yang berhak membubuhkan tanda tangan digital, lengkap dengan masa jabatannya." />
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />

      <div className="rounded-xl border border-line bg-surface-card p-5 shadow-card">
        <p className="text-sm font-semibold text-navy-900">Cara kerja dan aturan penarikan</p>
        <ul className="mt-3 grid gap-3 text-sm text-ink-soft md:grid-cols-3">
          <li><strong className="text-ink">Dibubuhkan sendiri.</strong> Tanda tangan hanya bisa dibubuhkan oleh pemilik akun saat ia menyetujui surat. Admin dan staf TU tidak dapat menandatangani atas nama pejabat.</li>
          <li><strong className="text-ink">Akhiri masa jabatan.</strong> Tanda tangan tidak bisa dipakai lagi mulai tanggal akhir. Surat yang sah pada masanya <em>tetap sah</em>. Gunakan saat pejabat berganti, lalu daftarkan penggantinya.</li>
          <li><strong className="text-ink">Cabut.</strong> Untuk keadaan khusus (mis. tanda tangan disalahgunakan). Dapat sekaligus menarik semua tanda tangan yang pernah dibubuhkan. Satu surat saja juga bisa ditarik dari halaman suratnya.</li>
        </ul>
      </div>

      {!rows.length ? (
        <div className="rounded-xl border border-line bg-surface-card shadow-card"><EmptyState title="Belum ada penandatangan" description="Daftarkan kepala sekolah di bawah agar dapat membubuhkan tanda tangan digital saat menyetujui surat." /></div>
      ) : (
        <ul className="space-y-4">
          {rows.map((s) => {
            const st = effective(s, today); const img = latest.get(s.id as string); const c = counts.get(s.id as string);
            const live = s.status === "ACTIVE";
            return (
              <li key={s.id as string} className="rounded-xl border border-line bg-surface-card p-5 shadow-card">
                <div className="flex flex-wrap items-start gap-5">
                  <div className="flex h-24 w-44 shrink-0 items-center justify-center rounded-lg border border-dashed border-line-strong bg-white p-2">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`data:${img.image_mime};base64,${img.image_data}`} alt={`Tanda tangan ${s.full_name}`} className="max-h-full max-w-full object-contain" />
                    ) : <span className="text-xs text-ink-mute">Belum ada gambar</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-display text-xl font-semibold text-navy-900">{s.full_name as string}</h2>
                      <Stamp tone={st.tone}>{st.label}</Stamp>
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{s.position as string}{s.nip ? ` - NIP ${s.nip}` : ""}</p>
                    <p className="mt-1 text-sm text-ink-soft tabular-nums">Berlaku {formatDate(s.valid_from as string)} sampai {s.valid_until ? formatDate(s.valid_until as string) : "belum ditentukan"}</p>
                    <p className="mt-1 text-xs text-ink-mute">Akun: {nameOf.get(s.profile_id as string) ?? "-"} - gambar versi {img?.version ?? "-"} - {c?.valid ?? 0} surat ditandatangani{c?.withdrawn ? `, ${c.withdrawn} ditarik` : ""}</p>
                    {s.end_reason && <p className="mt-2 rounded-md bg-surface px-3 py-2 text-xs text-ink-soft">Alasan {s.status === "REVOKED" ? "pencabutan" : "berakhir"}: {s.end_reason as string}</p>}
                  </div>
                </div>

                {live && (
                  <div className="mt-5 grid gap-5 border-t border-line pt-5 lg:grid-cols-[1.2fr_1fr]">
                    <form action={replaceSignatureImage} className="space-y-3">
                      <input type="hidden" name="id" value={s.id as string} />
                      <Field label="Ganti gambar tanda tangan" htmlFor={`img-${s.id}`}><FileInput id={`img-${s.id}`} name="image" required compact hint="PNG atau JPG, maks. 300 KB" /></Field>
                      <SubmitButton variant="secondary">Simpan gambar baru</SubmitButton>
                    </form>
                    <div className="flex flex-wrap items-start gap-2.5 lg:justify-end">
                      <form action={endSignatory}>
                        <input type="hidden" name="id" value={s.id as string} />
                        <ConfirmButton label="Akhiri masa jabatan" title={`Akhiri masa jabatan ${s.full_name}?`} confirmLabel="Akhiri" variant="primary"
                          message="Setelah tanggal akhir, tanda tangan ini tidak dapat dibubuhkan lagi. Surat yang sudah ditandatangani sebelumnya tetap sah.">
                          <Field label="Berakhir pada tanggal" htmlFor={`u-${s.id}`} required><input id={`u-${s.id}`} name="until" type="date" defaultValue={today} min={s.valid_from as string} className={inputClass} /></Field>
                          <Field label="Alasan" htmlFor={`r-${s.id}`} required><input id={`r-${s.id}`} name="reason" required minLength={5} placeholder="mis. masa jabatan berakhir" className={inputClass} /></Field>
                        </ConfirmButton>
                      </form>
                      <form action={revokeSignatory}>
                        <input type="hidden" name="id" value={s.id as string} />
                        <ConfirmButton label="Cabut" title={`Cabut penandatangan ${s.full_name}?`} confirmLabel="Cabut"
                          message="Gunakan hanya untuk keadaan khusus. Tanda tangan langsung tidak dapat dipakai lagi.">
                          <Field label="Alasan pencabutan" htmlFor={`cr-${s.id}`} required><input id={`cr-${s.id}`} name="reason" className={inputClass} /></Field>
                          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="withdraw_all" className="mt-0.5 h-4 w-4" /><span>Tarik juga <strong>semua</strong> tanda tangan yang pernah dibubuhkan ({c?.valid ?? 0} surat). Gunakan hanya bila tanda tangan disalahgunakan.</span></label>
                          <Field label="Ketik CABUT untuk konfirmasi" htmlFor={`cc-${s.id}`}><input id={`cc-${s.id}`} name="confirm" autoComplete="off" className={inputClass} /></Field>
                        </ConfirmButton>
                      </form>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Card title="Daftarkan penandatangan baru">
        <form action={createSignatory} encType="multipart/form-data" className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Akun pemilik tanda tangan" htmlFor="profile_id" required hint="Hanya pemilik akun ini yang dapat membubuhkan tanda tangan, saat ia menyetujui surat. Akun harus punya izin menyetujui surat (mis. Kepala Sekolah).">
              <select id="profile_id" name="profile_id" required defaultValue="" className={inputClass}>
                <option value="" disabled>Pilih akun</option>
                {accounts.map((a) => <option key={a.id as string} value={a.id as string}>{(a.full_name as string) || "Tanpa nama"} ({ROLE_LABEL[a.role_code as RoleCode] ?? a.role_code})</option>)}
              </select>
            </Field>
          </div>
          <Field label="Nama lengkap dan gelar" htmlFor="full_name" required hint="Dicetak di bawah tanda tangan."><input id="full_name" name="full_name" required className={inputClass} /></Field>
          <Field label="NIP" htmlFor="nip" optional><input id="nip" name="nip" className={inputClass} /></Field>
          <Field label="Jabatan" htmlFor="position" required hint="Mis. Kepala Sekolah atau Plt. Kepala Sekolah."><input id="position" name="position" required defaultValue="Kepala Sekolah" list="jabatan-list" className={inputClass} /></Field>
          <datalist id="jabatan-list"><option value="Kepala Sekolah" /><option value="Plt. Kepala Sekolah" /></datalist>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Berlaku mulai" htmlFor="valid_from" required><input id="valid_from" name="valid_from" type="date" required defaultValue={today} className={inputClass} /></Field>
            <Field label="Berakhir" htmlFor="valid_until" optional hint="Kosong = sampai diakhiri."><input id="valid_until" name="valid_until" type="date" className={inputClass} /></Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Gambar tanda tangan (dan stempel bila ada)" htmlFor="image" required hint="PNG latar transparan paling baik. Maksimal 300 KB. Pastikan gambar benar-benar milik pejabat yang bersangkutan.">
              <FileInput id="image" name="image" required hint="PNG atau JPG" />
            </Field>
          </div>
          <div className="sm:col-span-2"><SubmitButton>Daftarkan penandatangan</SubmitButton></div>
        </form>
      </Card>
    </div>
  );
}