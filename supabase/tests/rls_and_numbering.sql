-- Uji manual (SQL Editor / psql) pada database UJI. BELUM DIJALANKAN di lingkungan pembuatan.
-- Langkah: buat 3 pengguna uji (TU, GURU, KEPSEK), isi variabel di bawah, jalankan per blok.
-- Setiap blok menyatakan hasil yang diharapkan di komentar.

-- 1) Guru TIDAK boleh melihat surat masuk (kecuali yang didisposisikan kepadanya)
--   set local role authenticated; select set_config('request.jwt.claims', '{"sub":"<UUID_GURU>"}', true);
--   select count(*) from public.incoming_letters;                 -- harapan: 0

-- 2) Surat rahasia tidak terlihat oleh TU lain/Arsiparis
--   (login sebagai TU-B) select count(*) from public.incoming_letters where is_confidential;   -- harapan: hanya milik sendiri

-- 3) Klien tidak boleh mengubah status langsung
--   (login TU) update public.incoming_letters set status='SELESAI' where id='<ID>';
--   -- harapan: ERROR "Kolom status/pembuat/penghapusan hanya dapat diubah melalui proses resmi"

-- 4) Audit tidak dapat diubah/dihapus klien
--   (login admin) delete from public.audit_logs;   -- harapan: ERROR permission denied

-- 5) Penomoran atomik: jalankan dua sesi bersamaan, masing-masing:
--   select public.finalize_outgoing_letter('<ID_SURAT_DISETUJUI_A>');  -- sesi 1
--   select public.finalize_outgoing_letter('<ID_SURAT_DISETUJUI_B>');  -- sesi 2 (bersamaan)
--   -- harapan: dua nomor berbeda berurutan, tanpa duplikat; indeks unik outgoing_number_unique menjaga.

-- 6) Pembuat tidak dapat menyetujui sendiri (non SUPER_ADMIN)
--   (login pembuat bukan admin) select public.transition_outgoing('<ID>','APPROVE');   -- harapan: ERROR

-- 7) Format nomor kosong menolak finalisasi
--   update public.school_settings set number_format=null; select public.finalize_outgoing_letter('<ID>');   -- harapan: ERROR "Format nomor surat belum dikonfirmasi"
