import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/data";
import { Card, Flash, PageHeader } from "@/components/ui";
import { OutgoingForm } from "@/components/OutgoingForm";
import { updateOutgoing } from "@/features/outgoing-actions";
import { OUTGOING_EDITABLE } from "@/lib/workflow";
import { firstParam } from "@/lib/utils";

export const metadata = { title: "Ubah surat keluar" };

export default async function Page({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | string[] | undefined> }) {
  await requirePermission("letters.outgoing.create", "letters.outgoing.update");
  const sb = createClient();
  const { data: l } = await sb.from("outgoing_letters").select("*").eq("id", params.id).maybeSingle();
  if (!l) notFound();
  if (!OUTGOING_EDITABLE.includes(l.status)) redirect(`/surat-keluar/${l.id}?error=` + encodeURIComponent("Surat pada status ini tidak dapat diubah. Buat versi baru bila perlu."));
  const cats = await getCategories(sb, "outgoing");
  return (
    <>
      <PageHeader title="Ubah surat keluar" crumbs={[{ label: "Surat keluar", href: "/surat-keluar" }, { label: l.subject, href: `/surat-keluar/${l.id}` }, { label: "Ubah" }]} />
      <Flash error={firstParam(searchParams.error)} />
      <Card><OutgoingForm action={updateOutgoing} categories={cats} templates={[]} values={l} cancelHref={`/surat-keluar/${l.id}`} /></Card>
    </>
  );
}
