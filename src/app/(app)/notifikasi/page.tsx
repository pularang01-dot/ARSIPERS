import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, PageHeader, SubmitButton } from "@/components/ui";
import { formatDateTime, cn } from "@/lib/utils";

export const metadata = { title: "Notifikasi" };

async function markAllRead() {
  "use server";
  const s = await requireSession();
  await createClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", s.userId).is("read_at", null);
  revalidatePath("/notifikasi");
}
async function markRead(formData: FormData) {
  "use server";
  const s = await requireSession();
  await createClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", String(formData.get("id") ?? "")).eq("user_id", s.userId);
  revalidatePath("/notifikasi");
}

export default async function Page() {
  const s = await requireSession();
  const { data } = await createClient().from("notifications").select("id, title, link, read_at, created_at").eq("user_id", s.userId).order("created_at", { ascending: false }).limit(50);
  const unread = (data ?? []).filter((n: any) => !n.read_at).length;
  return (
    <>
      <PageHeader title="Notifikasi" description="Judul notifikasi tidak memuat isi surat rahasia." action={unread > 0 ? <form action={markAllRead}><SubmitButton variant="secondary">Tandai semua dibaca</SubmitButton></form> : undefined} />
      <Card>{!data?.length ? <EmptyState title="Belum ada notifikasi" description="Surat baru, permintaan persetujuan, dan disposisi akan muncul di sini." /> : (
        <ul className="divide-y divide-line">{data.map((n: any) => (
          <li key={n.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              {n.link ? <Link href={n.link} className={cn("text-sm hover:underline", n.read_at ? "text-ink-soft" : "font-semibold text-navy-900")}>{n.title}</Link> : <span className="text-sm">{n.title}</span>}
              <p className="mt-0.5 text-xs text-ink-mute">{formatDateTime(n.created_at)}</p>
            </div>
            {!n.read_at && <form action={markRead}><input type="hidden" name="id" value={n.id} /><SubmitButton variant="ghost" className="px-3 text-xs">Tandai dibaca</SubmitButton></form>}
          </li>))}</ul>)}
      </Card>
    </>
  );
}
