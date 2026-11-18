# Tinjauan Keamanan (desain; belum diuji penetrasi)

| Risiko | Mitigasi di kode |
|---|---|
| Akses tanpa izin (IDOR/BOLA) | RLS di semua tabel; fungsi `can_view_*`; halaman memakai klien berhak pengguna; "tidak ada akses" tampil sebagai 404 |
| Manipulasi status/nomor dari klien | Trigger `guard_*` menolak perubahan kolom kritis; transisi hanya lewat RPC `SECURITY DEFINER` |
| Duplikasi nomor surat | Upsert counter per periode (kunci baris) + indeks unik `outgoing_number_unique` |
| Eskalasi role | `profiles` hanya dapat mengubah nama/NIP/jabatan sendiri (grant kolom); role lewat `admin_set_user`, tidak untuk diri sendiri; profil baru selalu GURU (user_metadata tidak dipercaya) |
| Audit dipalsukan | `write_audit` tidak dapat dipanggil klien; tabel tanpa policy tulis; hanya AUTH_LOGIN/LOGOUT lewat RPC berwhitelist |
| Unggah berbahaya | Validasi ukuran, magic bytes, kecocokan ekstensi; bucket privat; unduh via signed URL 60 detik; nama berkas disanitasi; path dibuat server |
| Kebocoran service role | `server-only`, tanpa `NEXT_PUBLIC_`; dipakai hanya untuk invite dan pembersihan berkas |
| XSS | React escaping; tanpa `dangerouslySetInnerHTML`; header keamanan di `next.config.mjs` |
| Open redirect | `safeNext()` pada parameter `next` |
| Injeksi filter | `sanitizeSearch()` sebelum `.or()/ilike` |
| CSV injection | `csvCell()` menetralkan awalan `= + - @` |
| Enumerasi akun | Pesan reset kata sandi seragam |
| Notifikasi bocor | Judul notifikasi generik, tanpa isi surat rahasia |
| Cache data sensitif | Service worker hanya cache aset statis dan /offline; API/berkas `no-store` |

Sisa risiko: CSP ketat belum dipasang (Next.js membutuhkan nonce); belum ada pemindaian virus pada berkas;
belum ada pembatasan laju selain bawaan Supabase; pastikan "Disable signups" aktif.
