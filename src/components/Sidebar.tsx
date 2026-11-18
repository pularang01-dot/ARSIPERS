"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, MailOpen, Send, Split, Archive, CalendarDays, BarChart3, Bell, Users, Settings, ScrollText, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: string; badge?: number };
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard, incoming: MailOpen, outgoing: Send, disposition: Split, archive: Archive,
  agenda: CalendarDays, reports: BarChart3, notifications: Bell, users: Users, settings: Settings, audit: ScrollText,
};

export function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const nav = (
    <nav aria-label="Navigasi utama" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
      {items.map((it) => {
        const Icon = ICONS[it.icon] ?? LayoutDashboard;
        const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
            className={cn("flex min-h-[40px] items-center gap-3 rounded-md px-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white",
              active ? "bg-white/15 font-medium text-white" : "text-navy-100/80 hover:bg-white/10 hover:text-white")}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{it.label}</span>
            {it.badge ? <span className="rounded-full bg-white px-1.5 text-[11px] font-semibold text-navy-900 tabular-nums">{it.badge > 99 ? "99+" : it.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
  const brand = (
    <div className="flex h-14 items-center gap-2.5 border-b border-white/10 px-5">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white font-display text-sm font-bold text-navy-900" aria-hidden>A</span>
      <div className="leading-tight"><p className="text-sm font-semibold tracking-wide text-white">ARSIPERS</p><p className="text-[11px] text-navy-100/70">Persuratan dan Kearsipan</p></div>
    </div>
  );
  return (
    <>
      <button type="button" aria-label="Buka menu" aria-expanded={open} onClick={() => setOpen(true)}
        className="fixed left-3 top-2.5 z-30 flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white text-ink lg:hidden"><Menu className="h-5 w-5" /></button>
      <aside className="hidden w-60 shrink-0 flex-col bg-navy-900 lg:flex">{brand}{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Tutup menu" className="absolute inset-0 bg-navy-950/50" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-navy-900">
            <button type="button" aria-label="Tutup menu" onClick={() => setOpen(false)} className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center text-white"><X className="h-5 w-5" /></button>
            {brand}{nav}
          </aside>
        </div>
      )}
    </>
  );
}
