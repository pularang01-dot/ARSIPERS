-- OPSIONAL. Contoh kategori generik untuk uji coba; BUKAN pedoman resmi sekolah. Ganti sesuai kebijakan sekolah.
insert into public.letter_categories (kind, code, name) values
 ('incoming','UMUM','Umum'), ('incoming','UNDANGAN','Undangan'), ('incoming','EDARAN','Surat edaran'),
 ('outgoing','UMUM','Umum'), ('outgoing','UNDANGAN','Undangan'), ('outgoing','KET','Surat keterangan')
on conflict do nothing;
