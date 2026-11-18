# Rencana Uji

Otomatis: `npm test` (vitest, `tests/core.test.ts`): workflow, penomoran, utilitas keamanan, unggah, izin, validasi zod, template, PDF.
Manual SQL: `supabase/tests/rls_and_numbering.sql` (RLS, guard kolom, audit, konkurensi nomor, pemisahan peran persetujuan).

Alur uji manual end-to-end:
1. TU mencatat surat masuk + lampiran -> verifikasi -> Kepala Sekolah membuat disposisi -> Guru menerima, mengerjakan, menyelesaikan -> TU menandai selesai -> arsip.
2. TU membuat draft surat keluar -> ajukan -> Kepala Sekolah tinjau, minta revisi, TU ajukan ulang, setujui -> TU finalkan (nomor terbit) -> unduh PDF -> catat pengiriman -> arsip.
3. Guru membuka `/surat-masuk` (harus ditolak) dan membuka URL surat yang tidak didisposisikan (404).
4. Surat berstatus RAHASIA tidak tampak oleh Arsiparis dan TU lain.
5. Dua TU memfinalkan surat bersamaan: nomor berbeda, tanpa duplikat.
6. Unggah `.pdf` palsu (isi PNG), berkas > batas, `.exe`: semuanya ditolak.
7. Nonaktifkan pengguna: sesi berikutnya ditolak.
8. Responsif 360 px, navigasi keyboard, pembaca layar pada formulir, mode gerak berkurang.
