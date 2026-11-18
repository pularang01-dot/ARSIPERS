# Checklist Aksesibilitas (diterapkan di kode; perlu diverifikasi di browser)
- [x] Label terkait `htmlFor` pada seluruh input; penanda wajib dan petunjuk (`hint`).
- [x] Fokus terlihat (`focus-visible`), target sentuh min. 40 px, tabel dengan `caption`/`scope`.
- [x] Pesan berstatus memakai `role="status"/"alert"`; dialog konfirmasi memakai `<dialog>` native.
- [x] Mode gerak berkurang dihormati; tidak ada animasi dekoratif.
- [x] Status tidak hanya warna (teks label pada setiap badge).
- [ ] Uji pembaca layar (NVDA/TalkBack), kontras aktual, dan 360 px di perangkat nyata.
