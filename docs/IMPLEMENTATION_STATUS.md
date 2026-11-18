# Status Implementasi

## Terverifikasi (dijalankan)
- Sintaks TypeScript seluruh `src` dan `tests`: tidak ada galat sintaks (pemeriksaan sintaks saja, bukan typecheck penuh).
- 17 uji logika murni lolos (workflow, penomoran, CSV/pencarian/redirect/nama berkas, validasi unggah, izin, template)
  dijalankan dengan shim ringan karena `vitest` tidak terpasang offline.

## BELUM diverifikasi (wajib sebelum produksi)
- `npm install`, `npm run typecheck`, `npm run lint`, `npm run build`: belum dijalankan.
- Uji `zod` (validation) dan `pdf-lib` (PDF) dalam `tests/core.test.ts`: ditulis, belum dijalankan.
- Seluruh migrasi SQL belum dijalankan pada Postgres/Supabase. Kemungkinan perlu perbaikan kecil.
- RLS dan RPC belum diuji (lihat `supabase/tests/rls_and_numbering.sql`). Uji konkurensi penomoran belum dilakukan.
- Tampilan belum diperiksa di browser; responsif, kontras, dan keyboard perlu diuji manual.
- Alur email undangan/reset kata sandi bergantung konfigurasi SMTP/redirect Supabase.

## Asumsi (perlu konfirmasi sekolah)
| Hal | Asumsi saat ini |
|---|---|
| Matriks role-izin | Rekomendasi di `0002_seed_and_helpers.sql`; lihat `ROLE_PERMISSION_MATRIX.md` |
| Siapa melihat surat rahasia | SUPER_ADMIN, KEPALA_SEKOLAH, pembuat, penerima disposisi |
| Format nomor surat | KOSONG sampai dikonfirmasi; finalisasi ditolak bila kosong |
| Reset nomor | Tahunan (dapat diubah) |
| Persetujuan | Pembuat tidak boleh menyetujui suratnya sendiri (kecuali SUPER_ADMIN) |
| Batas unggah | 5 MB (env `MAX_UPLOAD_MB`, maks 10), PDF/JPG/PNG |
| Kategori, template, klasifikasi arsip, retensi | Tidak diisi; kosong sampai sekolah memberi pedoman |
| Identitas sekolah (NPSN, alamat, kepala sekolah, logo) | Tidak diisi. Tidak ada data fiktif |
| Logo/tanda tangan/stempel pada PDF | Tidak ada; ruang tanda tangan dikosongkan untuk tanda tangan manual |

## Belum dibangun / batasan
- Unggah logo sekolah, tanda tangan digital, dan stempel.
- Penghapusan lampiran dan pratinjau berkas di aplikasi (hanya unduh).
- Pencarian teks penuh pada arsip lintas halaman (filter jenis/tanggal server-side; teks hanya pada halaman tampil).
- Realtime notifikasi dan email notifikasi (notifikasi dalam aplikasi saja).
- Pembatasan percobaan login: mengandalkan rate limit bawaan Supabase Auth.
- Pembersihan berkas yatim terjadwal. Pembersihan dilakukan best-effort saat insert gagal.
- Tes end-to-end (Playwright) belum dibuat.
