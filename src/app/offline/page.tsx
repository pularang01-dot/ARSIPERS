import Image from "next/image";
import { Copyright } from "@/components/Copyright";

export const metadata = { title: "Tidak ada koneksi" };
export default function Offline() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 text-center">
      <div className="max-w-sm">
        <Image src="/logo-256.png" alt="Lencana ARSIPERS" width={256} height={264} className="mx-auto h-24 w-auto" />
        <h1 className="mt-5 font-display text-2xl font-semibold text-navy-900">Tidak ada koneksi internet</h1>
        <p className="mt-2 text-sm text-ink-soft">ARSIPERS membutuhkan koneksi untuk menampilkan dan menyimpan data surat. Tidak ada data surat yang disimpan di perangkat ini. Periksa jaringan Anda lalu muat ulang halaman.</p>
        <Copyright className="mt-10" />
      </div>
    </main>
  );
}