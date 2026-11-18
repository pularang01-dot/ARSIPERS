# Matriks Role dan Izin (rekomendasi awal, perlu konfirmasi)

Sumber kebenaran: tabel `role_permissions` (seed di `0002`). Ubah lewat migrasi SQL, bukan UI.

| Izin | SUPER_ADMIN | KEPALA_SEKOLAH | OPERATOR_TU | GURU | KOORDINATOR | ARSIPARIS |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| letters.incoming.view | v | v | v | | | v |
| letters.incoming.create / update | v | | v | | | |
| letters.incoming.delete | v | | | | | |
| letters.outgoing.view | v | v | v | | | v |
| letters.outgoing.create / update / submit | v | | v | | | |
| letters.outgoing.approve | v | v | | | | |
| letters.disposition.create | v | v | | | | |
| letters.disposition.respond | v | | | v | v | |
| archives.view | v | v | v | | | v |
| archives.manage | v | | v | | | v |
| reports.view | v | v | v | | | v |
| users.manage / settings.manage | v | | | | | |
| audit_logs.view | v | v | | | | |

Catatan: penerima disposisi melihat surat terkait walau tanpa `letters.incoming.view`. Surat rahasia hanya
untuk SUPER_ADMIN, KEPALA_SEKOLAH, pembuat, dan penerima disposisi. Super Admin dapat menyetujui sendiri.
