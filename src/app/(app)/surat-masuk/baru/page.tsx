import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/data";
import { Card, Flash, PageHeader } from "@/components/ui";
import { IncomingForm } from "@/components/IncomingForm";
import { createIncoming } from "@/features/incoming-actions";
import { firstParam } from "@/lib/utils";

export const metadata = { title: "Catat surat masuk" };

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await requirePermission("letters.incoming.create");
  const cats = await getCategories(createClient(), "incoming");
  return (
    <>
      <PageHeader title="Catat surat masuk" crumbs={[{ label: "Surat masuk", href: "/surat-masuk" }, { label: "Catat baru" }]} />
      <Flash error={firstParam(searchParams.error)} />
      <Card><IncomingForm action={createIncoming} categories={cats} cancelHref="/surat-masuk" withFile /></Card>
    </>
  );
}
