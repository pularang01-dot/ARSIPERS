import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { can, ROLE_LABEL, type RoleCode } from "@/lib/permissions";
import { Sidebar, type NavItem } from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { Bell, Search } from "lucide-react";
import { Copyright } from "@/components/Copyright";
import { InstallBanner, InstallButton } from "@/components/install";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  const supabase = createClient();
  const { count: unread } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", s.userId).is("read_at", null);
  const { data: cfg } = await supabase.from("school_settings").select("test_mode").eq("id", 1).maybeSingle();
  const testMode = !!cfg?.test_mode;
  const p = (x: Parameters<typeof can>[1]) => can(s.permissions, x);

  const items: NavItem[] = [{ href: "/", label: "Dashboard", icon: "dashboard", group: "Utama" }];
  items.push({ href: "/notifikasi", label: "Notifikasi", icon: "notifications", group: "Utama", badge: unread ?? 0 });
  if (p("letters.incoming.view")) items.push({ href: "/surat-masuk", label: "Surat masuk", icon: "incoming", group: "Persuratan" });
  if (p("letters.outgoing.view") || p("letters.outgoing.create")) items.push({ href: "/surat-keluar", label: "Surat keluar", icon: "outgoing", group: "Persuratan" });
  items.push({ href: "/disposisi", label: "Disposisi", icon: "disposition", group: "Persuratan" });
  if (p("archives.view")) items.push({ href: "/arsip", label: "Arsip", icon: "archive", group: "Kearsipan" });
  items.push({ href: "/agenda", label: "Agenda", icon: "agenda", group: "Kearsipan" });
  if (p("reports.view")) items.push({ href: "/laporan", label: "Laporan", icon: "reports", group: "Kearsipan" });
  if (p("users.manage")) items.push({ href: "/pengguna", label: "Pengguna", icon: "users", group: "Administrasi" });
  if (p("settings.manage")) items.push({ href: "/pengaturan", label: "Pengaturan", icon: "settings", group: "Administrasi" });
  if (p("audit_logs.view")) items.push({ href: "/audit-log", label: "Riwayat aktivitas", icon: "audit", group: "Administrasi" });

  const dateLabel = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date());

  return (
    <div className="flex min-h-screen">
      <a href="#konten" className="sr-only z-50 rounded-md bg-white px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Lewati ke konten</a>
      <Sidebar items={items} user={{ name: s.fullName, role: ROLE_LABEL[s.roleCode as RoleCode] ?? s.roleCode }} signOut={signOut} />
      <div className="flex min-w-0 flex-1 flex-col">
        {testMode && (
          <div role="status" className="bg-brass px-4 py-2 text-center text-sm font-medium text-white">
            MODE UJI COBA aktif: surat yang dibuat sekarang hanya contoh, memakai nomor &ldquo;UJI-&rdquo;, dan tidak resmi.
            {p("settings.manage") && <> <Link href="/pengaturan#uji-coba" className="underline underline-offset-2">Kelola</Link></>}
          </div>
        )}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-line bg-white/70 pl-16 pr-4 backdrop-blur-md lg:px-8">
          <form action="/surat-masuk" className="relative hidden max-w-md flex-1 sm:block" role="search">
            <label htmlFor="global-q" className="sr-only">Cari surat masuk</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" aria-hidden />
            <input id="global-q" name="q" type="search" placeholder="Cari surat masuk: perihal, pengirim, nomor"
              className="block h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm shadow-card placeholder:text-ink-mute focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600" />
          </form>
          <div className="ml-auto flex items-center gap-3">
            <InstallButton />
            <p className="hidden text-sm text-ink-soft md:block">{dateLabel}</p>
            <Link href="/notifikasi" aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ""}`}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white text-ink-soft shadow-card hover:text-ink">
              <Bell className="h-[18px] w-[18px]" />
              {unread ? <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brass px-1 text-[10px] font-semibold tabular-nums text-white">{unread > 99 ? "99+" : unread}</span> : null}
            </Link>
          </div>
        </header>
        <main id="konten" className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-7 lg:px-8"><InstallBanner className="mb-6" />{children}</main>
        <footer className="border-t border-line px-4 py-4 text-center lg:px-8"><Copyright /></footer>
      </div>
    </div>
  );
}