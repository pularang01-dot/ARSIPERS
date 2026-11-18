export const metadata = { title: "Tidak ada koneksi" };
export default function Offline() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 text-center">
      <div className="max-w-sm">
        <h1 className="font-display text-2xl font-semibold text-navy-900">Tidak ada koneksi internet</h1>
        <p className="mt-2 text-sm text-ink-soft">ARSIPERS membutuhkan koneksi untuk menampilkan dan menyimpan data surat. Tidak ada data surat yang disimpan di perangkat ini. Periksa jaringan Anda lalu muat ulang halaman.</p>
      </div>
    </main>
  );
}
