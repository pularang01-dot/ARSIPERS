/** Contoh susunan umum untuk memulai. Bukan format resmi sekolah: sesuaikan dengan gaya surat yang berlaku.
 *  Tanggal, "Yth. ...", perihal, dan tanda tangan kepala sekolah sudah otomatis ada pada PDF, jadi cukup isi badan surat. */
export const TEMPLATE_STARTERS: { id: string; name: string; type: string; body: string }[] = [
  {
    id: "undangan", name: "Surat undangan", type: "UNDANGAN",
    body: `Dengan hormat,

Sehubungan dengan kegiatan di {{nama_sekolah}}, kami mengundang Bapak/Ibu untuk hadir pada:

Hari/tanggal  : [isi hari dan tanggal]
Waktu         : [isi waktu]
Tempat        : [isi tempat]
Acara         : {{perihal}}

Demikian undangan ini kami sampaikan. Atas perhatian dan kehadiran Bapak/Ibu, kami ucapkan terima kasih.`,
  },
  {
    id: "tugas", name: "Surat tugas", type: "TUGAS",
    body: `Yang bertanda tangan di bawah ini, Kepala {{nama_sekolah}}, menugaskan kepada:

Nama       : [isi nama]
NIP        : [isi NIP]
Jabatan    : [isi jabatan]

untuk melaksanakan tugas: {{perihal}}
pada hari/tanggal [isi hari dan tanggal], bertempat di [isi tempat].

Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.`,
  },
  {
    id: "keterangan", name: "Surat keterangan", type: "KETERANGAN",
    body: `Yang bertanda tangan di bawah ini, Kepala {{nama_sekolah}}, menerangkan bahwa:

Nama        : [isi nama]
Keterangan  : {{perihal}}

[isi uraian keterangan]

Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.`,
  },
  {
    id: "pemberitahuan", name: "Surat pemberitahuan", type: "PEMBERITAHUAN",
    body: `Dengan hormat,

Melalui surat ini kami memberitahukan bahwa {{perihal}}.

[isi penjelasan lebih lanjut]

Atas perhatian Bapak/Ibu, kami ucapkan terima kasih.`,
  },
  {
    id: "permohonan", name: "Surat permohonan", type: "PERMOHONAN",
    body: `Dengan hormat,

Sehubungan dengan {{perihal}}, dengan ini {{nama_sekolah}} mengajukan permohonan [isi permohonan].

[isi alasan dan penjelasan]

Besar harapan kami agar permohonan ini dapat dikabulkan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.`,
  },
];