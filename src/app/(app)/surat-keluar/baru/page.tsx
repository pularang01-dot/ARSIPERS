import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/data";
import { Card, Flash, PageHeader } from "@/components/ui";
import { OutgoingForm } from "@/components/OutgoingForm";
import { createOutgoing } from "@/features/outgoing-actions";
import { firstParam } from "@/lib/utils";

export const metadata = { title: "Buat surat keluar" };

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const sess = await requirePermission("letters.outgoing.create");
  const sb = createClient();
  const [cats, { data: tpl }] = await Promise.all([getCategories(sb, "outgoing"), sb.from("letter_templates").select("id, name").eq("is_active", true).order("name")]);
  return (
    <>
      <PageHeader title="Buat surat keluar" description="Isi data berikut. Kolom bertanda * wajib diisi." crumbs={[{ label: "Surat keluar", href: "/surat-keluar" }, { label: "Buat baru" }]} />
      <Flash error={firstParam(searchParams.error)} />
      <Card><OutgoingForm action={createOutgoing} manageCategoriesHref={can(sess.permissions, "settings.manage") ? "/pengaturan#kategori" : undefined} categories={cats} templates={tpl ?? []} cancelHref="/surat-keluar" isNew /></Card>
    </>
  );
}