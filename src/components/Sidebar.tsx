"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, MailOpen, Send, Split, Archive, CalendarDays, BarChart3, Bell, Users, Settings, ScrollText, Menu, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: string; group: string; badge?: number };
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard, incoming: MailOpen, outgoing: Send, disposition: Split, archive: Archive,
  agenda: CalendarDays, reports: BarChart3, notifications: Bell, users: Users, settings: Settings, audit: ScrollText,
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[1][0] : "")).toUpperCase();
}

export function Sidebar({ items, user, signOut }: { items: NavItem[]; user: { name: string; role: string }; signOut: () => Promise<void> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = Array.from(new Set(items.map((i) => i.group)));

  const brand = (
    <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-card"><Image src="/logo-256.png" alt="" width={256} height={264} className="h-8 w-auto" /></span>
      <div className="min-w-0 leading-tight">
        <p className="text-[15px] font-semibold tracking-[0.12em] text-white">ARSIPERS</p>
        <p className="truncate text-[11px] text-navy-100/70">SDN Pandian I Sumenep</p>
      </div>
    </div>
  );

  const nav = (
    <nav aria-label="Navigasi utama" className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
      {groups.map((g) => (
        <div key={g}>
          <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy-100/45">{g}</p>
          <ul className="space-y-0.5">
            {items.filter((i) => i.group === g).map((it) => {
              const Icon = ICONS[it.icon] ?? LayoutDashboard;
              const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
              return (
                <li key={it.href}>
                  <Link href={it.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
                    className={cn("relative flex min-h-[40px] items-center gap-3 rounded-md px-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white",
                      active ? "bg-white/10 font-medium text-white before:absolute before:bottom-2 before:left-0 before:top-2 before:w-[3px] before:rounded-r before:bg-brass" : "text-navy-100/75 hover:bg-white/5 hover:text-white")}>
                    <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brass-soft" : "")} />
                    <span className="flex-1">{it.label}</span>
                    {it.badge ? <span className="rounded-full bg-brass px-1.5 text-[11px] font-semibold tabular-nums text-white">{it.badge > 99 ? "99+" : it.badge}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-3 rounded-lg bg-white/5 p-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brass-soft text-xs font-semibold text-brass-dark" aria-hidden>{initials(user.name)}</span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="truncate text-xs text-navy-100/65">{user.role}</p>
        </div>
        <form action={signOut}>
          <button type="submit" aria-label="Keluar" title="Keluar" className="flex h-9 w-9 items-center justify-center rounded-md text-navy-100/75 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"><LogOut className="h-[18px] w-[18px]" /></button>
        </form>
      </div>
    </div>
  );

  const panelBg = "bg-gradient-to-b from-navy-900 to-navy-950";
  return (
    <>
      <button type="button" aria-label="Buka menu" aria-expanded={open} onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white text-ink shadow-card lg:hidden"><Menu className="h-5 w-5" /></button>
      <aside className={cn("sticky top-0 hidden h-screen w-64 shrink-0 flex-col lg:flex", panelBg)}>{brand}{nav}{account}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Tutup menu" className="absolute inset-0 bg-navy-950/50" onClick={() => setOpen(false)} />
          <aside className={cn("relative flex h-full w-72 max-w-[85vw] flex-col", panelBg)}>
            <button type="button" aria-label="Tutup menu" onClick={() => setOpen(false)} className="absolute right-2 top-3 z-10 flex h-10 w-10 items-center justify-center text-white"><X className="h-5 w-5" /></button>
            {brand}{nav}{account}
          </aside>
        </div>
      )}
    </>
  );
}