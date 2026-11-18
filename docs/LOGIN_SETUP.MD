# Setup Login: Undangan Email + Google

Prinsip: **hanya orang yang diundang admin yang bisa masuk**, lewat email/kata sandi atau Google.

## 1. Google Cloud Console
1. Buat proyek, lalu siapkan OAuth consent screen (tipe External; cakupan dasar email dan profile). Pastikan status aplikasi **In production**, bukan Testing, agar semua pengguna undangan dapat login.
2. Buat OAuth Client ID tipe **Web application**.
3. Authorized redirect URI: `https://<PROJECT_REF>.supabase.co/auth/v1/callback` (persis seperti ditampilkan di Supabase pada halaman provider Google).
4. Salin Client ID dan Client Secret.

## 2. Supabase
- Authentication > Sign In / Providers > Google: aktifkan, isi Client ID dan Secret.
- Pada pengaturan yang sama, **matikan pendaftaran pengguna baru** (Allow new users to sign up = OFF).
- Authentication > URL Configuration: Site URL = alamat aplikasi (mis. `https://arsipers.example.sch.id`). Redirect URLs tambahkan `https://<DOMAIN>/**` dan `http://localhost:3000/**`.
- Authentication > Emails > Templates: pakai template baru (`email-templates/*.html`) yang memakai `{{ .SiteURL }}/auth/confirm?token_hash=...`.
- Jalankan migrasi `0005_invite_only_profiles.sql`.

## 3. Alur
- **Undangan:** admin menu Pengguna > Kirim undangan > pengguna klik tombol di email > `/auth/confirm` > buat kata sandi > masuk. Selanjutnya boleh login email/kata sandi atau Google (email Google harus sama dengan email undangan).
- **Google:** tombol di halaman masuk > Google > `/auth/callback` > pemeriksaan profil aktif > dashboard. Email Google yang tidak diundang ditolak.
- **Lupa kata sandi:** halaman masuk > Lupa kata sandi > email > `/auth/confirm` > buat kata sandi baru.

## 4. Pengujian wajib
1. Undang email A; buka tautan di perangkat lain; buat kata sandi; login.
2. Login Google dengan email A (sudah diundang): harus berhasil dan tidak membuat akun ganda (cek Authentication > Users).
3. Login Google dengan email B yang TIDAK diundang: harus ditolak dengan pesan.
4. Nonaktifkan A di menu Pengguna: login Google/email harus ditolak.
5. Pakai tautan undangan dua kali: kali kedua harus menampilkan "sudah digunakan".