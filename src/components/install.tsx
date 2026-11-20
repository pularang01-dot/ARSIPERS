"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Download, MoreVertical, Share, Smartphone, X } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type InstallCtx = { ready: boolean; hidden: boolean; canPrompt: boolean; isIOS: boolean; install: () => Promise<void> };
const Ctx = createContext<InstallCtx>({ ready: false, hidden: true, canPrompt: false, isIOS: false, install: async () => undefined });
export const useInstall = () => useContext(Ctx);

const DISMISS_KEY = "arsipers-install-dismissed";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

/** Menyediakan status "dapat dipasang" ke seluruh aplikasi dan dialog panduan pemasangan manual. */
export function InstallProvider({ children }: { children: React.ReactNode }) {
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [ready, setReady] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    setReady(true);

    const onPrompt = (e: Event) => { e.preventDefault(); deferred.current = e as BeforeInstallPromptEvent; setCanPrompt(true); };
    const onInstalled = () => { deferred.current = null; setCanPrompt(false); setInstalled(true); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  const install = useCallback(async () => {
    const ev = deferred.current;
    if (ev) {
      await ev.prompt();
      const choice = await ev.userChoice;
      deferred.current = null;
      setCanPrompt(false);
      if (choice.outcome === "accepted") setInstalled(true);
      return;
    }
    dialogRef.current?.showModal(); // tidak ada dialog bawaan: tampilkan panduan manual
  }, []);

  const value = useMemo(() => ({ ready, hidden: standalone || installed, canPrompt, isIOS, install }), [ready, standalone, installed, canPrompt, isIOS, install]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <dialog ref={dialogRef} aria-labelledby="install-guide-title" className="w-[min(92vw,28rem)] rounded-xl border border-line p-0 shadow-lift backdrop:bg-navy-950/40">
        <div className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 id="install-guide-title" className="font-display text-xl font-semibold text-navy-900">Pasang ARSIPERS</h2>
            <button type="button" aria-label="Tutup" onClick={() => dialogRef.current?.close()} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-soft hover:bg-surface"><X className="h-4 w-4" /></button>
          </div>
          <p className="text-sm text-ink-soft">Aplikasi dipasang langsung dari browser, tanpa Play Store. Setelah terpasang, ARSIPERS muncul di layar utama seperti aplikasi biasa.</p>
          {isIOS ? (
            <ol className="space-y-3 text-sm text-ink">
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-semibold text-white">1</span><span>Buka halaman ini di <strong>Safari</strong>, lalu ketuk ikon <Share className="mx-0.5 inline h-4 w-4 align-text-bottom" aria-label="Bagikan" /> <strong>Bagikan</strong> di bagian bawah layar.</span></li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-semibold text-white">2</span><span>Gulir ke bawah dan pilih <strong>Tambah ke Layar Utama</strong>.</span></li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-semibold text-white">3</span><span>Ketuk <strong>Tambah</strong>. Ikon ARSIPERS akan muncul di layar utama.</span></li>
            </ol>
          ) : (
            <ol className="space-y-3 text-sm text-ink">
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-semibold text-white">1</span><span><strong>Android (Chrome):</strong> ketuk menu <MoreVertical className="mx-0.5 inline h-4 w-4 align-text-bottom" aria-label="tiga titik" />, lalu pilih <strong>Instal aplikasi</strong> atau <strong>Tambahkan ke layar utama</strong>.</span></li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-semibold text-white">2</span><span><strong>Komputer (Chrome atau Edge):</strong> klik ikon <Download className="mx-0.5 inline h-4 w-4 align-text-bottom" aria-label="instal" /> di ujung kanan bilah alamat, atau menu <MoreVertical className="mx-0.5 inline h-4 w-4 align-text-bottom" aria-label="tiga titik" /> lalu <strong>Instal ARSIPERS</strong>.</span></li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-semibold text-white">3</span><span>Jika pilihan itu tidak ada, pastikan Anda membuka alamat resmi (HTTPS) dengan Chrome atau Edge versi terbaru.</span></li>
            </ol>
          )}
          <div className="flex justify-end pt-1"><button type="button" onClick={() => dialogRef.current?.close()} className={buttonClass("primary")}>Mengerti</button></div>
        </div>
      </dialog>
    </Ctx.Provider>
  );
}

/** Tombol Pasang aplikasi. Disembunyikan bila aplikasi sudah terpasang/dibuka sebagai aplikasi. */
export function InstallButton({ className }: { className?: string }) {
  const { ready, hidden, install } = useInstall();
  if (!ready || hidden) return null;
  return (
    <button type="button" onClick={() => void install()} aria-label="Pasang aplikasi" className={cn(buttonClass("secondary", "min-h-[40px] gap-2 px-3 text-sm shadow-card"), className)}>
      <Download className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Pasang aplikasi</span>
    </button>
  );
}

/** Notifikasi ajakan memasang aplikasi. Dapat ditutup; muncul lagi setelah 7 hari. */
export function InstallBanner({ className }: { className?: string }) {
  const { ready, hidden, canPrompt, isIOS, install } = useInstall();
  const [snoozed, setSnoozed] = useState(true);
  useEffect(() => {
    try { setSnoozed(Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < SNOOZE_MS); } catch { setSnoozed(false); }
  }, []);
  if (!ready || hidden || snoozed || !(canPrompt || isIOS)) return null;
  const dismiss = () => { try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* abaikan */ } setSnoozed(true); };
  return (
    <div role="region" aria-label="Pasang aplikasi" className={cn("flex flex-wrap items-center gap-4 rounded-xl border border-brass/40 bg-brass-soft px-5 py-4 shadow-card", className)}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-brass-dark" aria-hidden><Smartphone className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-sm font-semibold text-navy-900">Pasang ARSIPERS di perangkat Anda</p>
        <p className="mt-0.5 text-sm text-ink-soft">Buka lebih cepat dari layar utama, tanpa mengetik alamat setiap kali.</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => void install()} className={buttonClass("primary", "gap-2")}><Download className="h-4 w-4" aria-hidden />Pasang sekarang</button>
        <button type="button" onClick={dismiss} className={buttonClass("ghost")}>Nanti saja</button>
      </div>
    </div>
  );
}