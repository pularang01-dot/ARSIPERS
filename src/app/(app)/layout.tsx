import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { can, ROLE_LABEL, type RoleCode } from "@/lib/permissions";
import { Sidebar, type NavItem } from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { Bell, LogOut } from "lucide-react";
import { buttonClass } from "@/components/ui";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  const supabase = createClient();
  const { count: unread } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", s.userId).is("read_at", null);
  const p = (x: Parameters<typeof can>[1]) => can(s.permissions, x);

  const items: NavItem[] = [{ href: "/", label: "Dashboard", icon: "dashboard" }];
  if (p("letters.incoming.view")) items.push({ href: "/surat-masuk", label: "Surat masuk", icon: "incoming" });
  if (p("letters.outgoing.view") || p("letters.outgoing.create")) items.push({ href: "/surat-keluar", label: "Surat keluar", icon: "outgoing" });
  items.push({ href: "/disposisi", label: "Disposisi", icon: "disposition" });
  if (p("archives.view")) items.push({ href: "/arsip", label: "Arsip", icon: "archive" });
  items.push({ href: "/agenda", label: "Agenda", icon: "agenda" });
  if (p("reports.view")) items.push({ href: "/laporan", label: "Laporan", icon: "reports" });
  items.push({ href: "/notifikasi", label: "Notifikasi", icon: "notifications", badge: unread ?? 0 });
  if (p("users.manage")) items.push({ href: "/pengguna", label: "Pengguna", icon: "users" });
  if (p("settings.manage")) items.push({ href: "/pengaturan", label: "Pengaturan", icon: "settings" });
  if (p("audit_logs.view")) items.push({ href: "/audit-log", label: "Audit log", icon: "audit" });

  return (
    <div className="flex min-h-screen">
      <Sidebar items={items} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-white/95 pl-16 pr-4 backdrop-blur lg:px-8">
          <form action="/surat-masuk" className="hidden max-w-sm flex-1 sm:block" role="search">
            <label htmlFor="global-q" className="sr-only">Cari surat masuk</label>
            <input id="global-q" name="q" type="search" placeholder="Cari surat masuk: perihal, pengirim, nomor" className="block h-9 w-full rounded-md border border-line bg-surface px-3 text-sm placeholder:text-ink-mute focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600" />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/notifikasi" aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ""}`} className="relative flex h-10 w-10 items-center justify-center rounded-md text-ink-soft hover:bg-navy-50">
              <Bell className="h-5 w-5" />
              {unread ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-bad" aria-hidden /> : null}
            </Link>
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium text-ink">{s.fullName}</p>
              <p className="text-xs text-ink-mute">{ROLE_LABEL[s.roleCode as RoleCode] ?? s.roleCode}</p>
            </div>
            <form action={signOut}>
              <button type="submit" className={buttonClass("ghost", "px-3")} aria-label="Keluar"><LogOut className="h-4 w-4" /><span className="hidden md:inline">Keluar</span></button>
            </form>
          </div>
        </header>
        <main id="konten" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
