# ARSIPERS - Persuratan dan Kearsipan Sekolah

Aplikasi web (Next.js 14 App Router, TypeScript, Tailwind, Supabase) untuk SDN Pandian I Sumenep:
surat masuk, disposisi, surat keluar dengan alur persetujuan, penomoran atomik, PDF, arsip, agenda, laporan,
notifikasi, audit log, pengguna/role, dan PWA ringan.

> **Status jujur:** kode ini ditulis tanpa akses jaringan. `npm install`, `typecheck`, `build`, dan uji
> terhadap database Supabase **belum pernah dijalankan**. Baca `docs/IMPLEMENTATION_STATUS.md` sebelum produksi.

## Mulai cepat
1. Buat proyek Supabase. Jalankan berurutan di SQL Editor: `supabase/migrations/0001` -> `0004`.
   (Opsional: `supabase/seed_optional.sql` untuk kategori contoh.)
2. Salin `.env.example` ke `.env.local`, isi URL, anon key, service role key (server only), `NEXT_PUBLIC_APP_URL`.
3. Authentication > Providers: nonaktifkan pendaftaran publik (Disable signups). Atur URL redirect:
   `<APP_URL>/auth/callback`.
4. Buat akun pertama di Authentication > Users, lalu jalankan `supabase/bootstrap_first_admin.sql` (ganti email).
5. `npm install` -> `npm run typecheck` -> `npm test` -> `npm run dev`.
6. Di menu **Pengaturan** isi identitas sekolah dan **format nomor surat** (wajib sebelum surat dapat difinalkan).

## Struktur
- `supabase/migrations` skema, RLS, RPC atomik. `supabase/tests` skenario uji RLS/penomoran (manual).
- `src/lib` auth, izin, validasi, workflow, penomoran, PDF, upload. `src/features` server actions.
- `src/app/(app)` halaman terautentikasi. `src/app/api` unduh berkas, PDF, ekspor CSV.
- `docs/` audit, matriks izin, keamanan, rencana uji, deployment, panduan pengguna, status implementasi.
