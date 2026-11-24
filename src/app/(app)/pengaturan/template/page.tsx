import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, Flash, LinkButton, PageHeader, StatusBadge } from "@/components/ui";
import { countFillIns } from "@/lib/templates";
import { firstParam, formatDate } from "@/lib/utils";
import { FileText } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Template surat" };
type Row = Record<string, any>;

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await requirePermission("settings.manage");
  const { data } = await createClient().from("letter_templates").select("id, name, letter_type, body, version, is_active, updated_at").order("name");
  const rows = (data ?? []) as Row[];
  return (
    <div className="space-y-5">
      <PageHeader title="Template surat" crumbs={[{ label: "Pengaturan", href: "/pengaturan" }, { label: "Template surat" }]}
        description="Kerangka isi surat yang dapat dipilih saat membuat surat keluar. Tujuan, perihal, tanggal, dan nama sekolah terisi otomatis."
        action={<LinkButton href="/pengaturan/template/baru">Template baru</LinkButton>} />
      <Flash ok={firstParam(searchParams.ok)} error={firstParam(searchParams.error)} />

      <div className="rounded-xl border border-line bg-surface-card p-5 shadow-card">
        <p className="text-sm font-semibold text-navy-900">Cara kerjanya</p>
        <ol className="mt-3 grid gap-3 text-sm text-ink-soft sm:grid-cols-3">
          <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-semibold text-white">1</span><span><strong className="text-ink">Buat template</strong> sekali: pilih contoh atau tulis sendiri, lalu sisipkan isian otomatis dengan tombol.</span></li>
          <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-semibold text-white">2</span><span><strong className="text-ink">Pilih saat membuat surat</strong> keluar: isi surat langsung terisi dari template.</span></li>
          <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-semibold text-white">3</span><span><strong className="text-ink">Lengkapi bagian [isi ...]</strong> lalu ajukan. Tanggal dan tanda tangan sudah otomatis di PDF.</span></li>
        </ol>
      </div>

      {!rows.length ? (
        <div className="rounded-xl border border-line bg-surface-card shadow-card">
          <EmptyState title="Belum ada template" description="Mulai dari contoh siap pakai seperti surat undangan, surat tugas, atau surat keterangan." action={<LinkButton href="/pengaturan/template/baru">Buat template pertama</LinkButton>} />
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {rows.map((t) => {
            const fill = countFillIns(t.body as string);
            return (
              <li key={t.id as string}>
                <Link href={`/pengaturan/template/${t.id}`} className="group flex h-full flex-col rounded-xl border border-line bg-surface-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700" aria-hidden><FileText className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[17px] font-semibold text-navy-900 group-hover:underline">{t.name as string}</p>
                      <p className="text-xs text-ink-mute">Jenis {t.letter_type as string} - versi {t.version as number} - diubah {formatDate(t.updated_at as string)}</p>
                    </div>
                    <StatusBadge value={t.is_active ? "SELESAI" : "DRAFT"} tone={t.is_active ? "ok" : "idle"} />
                  </div>
                  <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-ink-soft">{(t.body as string).slice(0, 220)}</p>
                  {fill > 0 && <p className="mt-auto pt-3 text-xs text-brass-dark">{fill} bagian [isi ...] untuk dilengkapi</p>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}