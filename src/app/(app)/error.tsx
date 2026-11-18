"use client";
import { ErrorState, buttonClass } from "@/components/ui";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <ErrorState message="Terjadi kesalahan saat memuat halaman. Coba lagi; jika berulang, hubungi administrator." />
      <div className="flex justify-center"><button onClick={reset} className={buttonClass("secondary")}>Muat ulang</button></div>
    </div>
  );
}
