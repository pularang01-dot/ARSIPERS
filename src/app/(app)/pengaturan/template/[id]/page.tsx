import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Flash, PageHeader } from "@/components/ui";
import { TemplateEditor } from "@/components/TemplateEditor";
import { saveTemplate } from "@/features/admin-actions";
import { firstParam } from "@/lib/utils";

export const metadata = { title: "Ubah template" };

export default async function Page({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | string[] | undefined> }) {
  await requirePermission("settings.manage");
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const sb = createClient();
  const [{ data: t }, { data: school }] = await Promise.all([
    sb.from("letter_templates").select("id, name, letter_type, body, is_active, version").eq("id", params.id).maybeSingle(),
    sb.from("school_settings").select("name, principal_name, principal_nip").eq("id", 1).maybeSingle(),
  ]);
  if (!t) notFound();
  return (
    <div className="space-y-5">
      <PageHeader title={t.name} crumbs={[{ label: "Pengaturan", href: "/pengaturan" }, { label: "Template surat", href: "/pengaturan/template" }, { label: "Ubah" }]} />
      <Flash error={firstParam(searchParams.error)} />
      <TemplateEditor action={saveTemplate} school={school ?? {}} cancelHref="/pengaturan/template" values={{ id: t.id, name: t.name, letter_type: t.letter_type, body: t.body, is_active: t.is_active, version: t.version }} />
    </div>
  );
}