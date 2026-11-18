-- Jalankan SEKALI di SQL Editor Supabase setelah membuat akun pertama (Authentication > Users).
-- Ganti email di bawah. Setelah itu, kelola semua pengguna lewat menu Pengguna.
update public.profiles set role_code = 'SUPER_ADMIN', is_active = true
where id = (select id from auth.users where email = 'GANTI_DENGAN_EMAIL_ADMIN');
