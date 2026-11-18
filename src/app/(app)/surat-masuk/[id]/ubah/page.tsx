import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/data";
import { Card, Flash, PageHeader } from "@/components/ui";
import { IncomingForm } from "@/components/IncomingForm";
import { updateIncoming } from "@/features/incoming-actions";
import { INCOMING_EDITABLE } from "@/lib/workflow";
import { firstParam } from "@/lib/utils";

export const metadata = { title: "Ubah surat masuk" };

export default async function Page({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | string[] | undefined> }) {
  await requirePermission("letters.incoming.update");
  const sb = createClient();
  const { data: l } = await sb.from("incoming_letters").select("*").eq("id", params.id).maybeSingle();
  if (!l) notFound();
  if (!INCOMING_EDITABLE.includes(l.status)) redirect(`/surat-masuk/${l.id}?error=` + encodeURIComponent("Surat pada status ini tidak dapat diubah"));
  const cats = await getCategories(sb, "incoming");
  return (
    <>
      <PageHeader title="Ubah surat masuk" crumbs={[{ label: "Surat masuk", href: "/surat-masuk" }, { label: l.subject, href: `/surat-masuk/${l.id}` }, { label: "Ubah" }]} />
      <Flash error={firstParam(searchParams.error)} />
      <Card><IncomingForm action={updateIncoming} categories={cats} values={l} cancelHref={`/surat-masuk/${l.id}`} /></Card>
    </>
  );
}
