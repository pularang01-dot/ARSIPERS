# Deployment

1. Supabase: jalankan migrasi 0001-0004; Authentication: matikan signup publik, atur Site URL dan Redirect URL (`/auth/callback`), konfigurasikan SMTP untuk email undangan/reset.
2. Storage: bucket `letter-files` dibuat oleh migrasi 0003 (privat). Pastikan tidak diubah menjadi publik.
3. Hosting (mis. Vercel/VPS Node 20+): set env sesuai `.env.example`; `SUPABASE_SERVICE_ROLE_KEY` hanya di server.
4. Jalankan `bootstrap_first_admin.sql`, login, isi Pengaturan (identitas + format nomor), tambah pengguna.
5. Wajib HTTPS (service worker dan cookie aman). Siapkan backup database dan Storage berkala.
6. Pemeliharaan: tinjau berkas yatim di Storage (path tanpa baris `letter_attachments`) secara berkala.
