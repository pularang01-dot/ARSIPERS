/* Service worker ARSIPERS: HANYA menyimpan aset statis dan halaman /offline.
   Tidak pernah menyimpan halaman, API, atau berkas surat (data sensitif). */
const CACHE = "arsipers-static-v3";
const PRECACHE = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    // Navigation preload: permintaan halaman berjalan paralel dengan startup service worker (membuka aplikasi lebih cepat)
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try { return (await e.preloadResponse) || (await fetch(req)); }
      catch { return caches.match("/offline"); }
    })());
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
  }
});