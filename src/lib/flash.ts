import { redirect } from "next/navigation";

/** Redirect dengan pesan sukses/gagal (ditampilkan oleh <Flash/>). Jangan dipanggil di dalam try/catch. */
export function go(path: string, kind: "ok" | "error", message: string): never {
  const [base, hash] = path.split("#");
  const sep = base.includes("?") ? "&" : "?";
  redirect(`${base}${sep}${kind}=${encodeURIComponent(message.slice(0, 300))}${hash ? "#" + hash : ""}`);
}

/** Pesan galat database yang ramah; galat teknis tidak dibocorkan ke pengguna. */
export function friendlyError(err: { message?: string; code?: string } | null | undefined): string {
  if (!err) return "Terjadi kesalahan";
  if (err.code === "42501") return "Anda tidak memiliki izin untuk tindakan ini";
  if (err.code === "23505") return "Data duplikat ditemukan";
  if (err.code === "P0001" && err.message) return err.message;
  if (err.message && /^(Surat|Format|Alasan|Hanya|Pembuat|Perubahan|Anda|Isi|Pilih|Instruksi|Catatan|Metode|Penerima|Role|Pengguna|Disposisi|Akses|Aksi|Jenis|Revisi)/.test(err.message)) return err.message;
  return "Terjadi kesalahan pada server. Coba lagi atau hubungi administrator.";
}