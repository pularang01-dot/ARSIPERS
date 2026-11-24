import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Flash, PageHeader } from "@/components/ui";
import { TemplateEditor } from "@/components/TemplateEditor";
import { saveTemplate } from "@/features/admin-actions";
import { firstParam } from "@/lib/utils";

export const metadata = { title: "Template baru" };

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await requirePermission("settings.manage");
  const { data: school } = await createClient().from("school_settings").select("name, principal_name, principal_nip").eq("id", 1).maybeSingle();
  return (
    <div className="space-y-5">
      <PageHeader title="Template baru" crumbs={[{ label: "Pengaturan", href: "/pengaturan" }, { label: "Template surat", href: "/pengaturan/template" }, { label: "Baru" }]} description="Pilih contoh di bawah untuk memulai, atau tulis sendiri." />
      <Flash error={firstParam(searchParams.error)} />
      <TemplateEditor action={saveTemplate} school={school ?? {}} cancelHref="/pengaturan/template" />
    </div>
  );
}