import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  PageBreak,
  PageOrientation,
  ShadingType,
  VerticalAlign,
  Header,
  Footer,
  PageNumber,
} from 'docx';
import { ModulAjarData } from '../components/administrasi/ModulAjarGeneratorModal';
import { LkpdData } from '../components/administrasi/LkpdGeneratorModal';
import { ProtaData } from '../components/administrasi/ProtaGeneratorModal';
import { PromesData } from '../components/administrasi/PromesGeneratorModal';

// ==========================================
// STYLING CONSTANTS & HELPERS
// ==========================================

const FONT_FAMILY = 'Calibri';
const COLOR_PRIMARY = '0D3826'; // Hijau Tua Khas SDIT
const COLOR_TEXT = '1F2937';
const COLOR_MUTED = '4B5563';
const COLOR_BORDER = '9CA3AF';
const COLOR_HEADER_BG = 'F3F4F6';

const borderThin = {
  style: BorderStyle.SINGLE,
  size: 4, // 0.5 pt
  color: COLOR_BORDER,
};

const cellBordersAll = {
  top: borderThin,
  bottom: borderThin,
  left: borderThin,
  right: borderThin,
};

const cellBordersNone = {
  top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
};

function triggerDocxDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDateIndo(date = new Date()): string {
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
}

// ==========================================
// SHARED KOP & SIGNATURE HELPERS
// ==========================================

function createKopHeader(title: string, subtitle: string, metaInfo: string): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: 'YAYASAN AL FIKRI SEMARANG',
          font: FONT_FAMILY,
          size: 20, // 10pt
          bold: true,
          color: COLOR_MUTED,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: 'SDIT AL FIKRI SEMARANG',
          font: FONT_FAMILY,
          size: 26, // 13pt
          bold: true,
          color: COLOR_PRIMARY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      children: [
        new TextRun({
          text: 'Jl. Merpati Timur No. 12, Palebon, Pedurungan, Kota Semarang | Telp: (024) 6712345',
          font: FONT_FAMILY,
          size: 17, // 8.5pt
          color: COLOR_MUTED,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      border: {
        bottom: {
          style: BorderStyle.DOUBLE,
          size: 12,
          color: '000000',
        },
      },
      children: [],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 140, after: 40 },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          font: FONT_FAMILY,
          size: 26, // 13pt
          bold: true,
          color: COLOR_PRIMARY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: subtitle,
          font: FONT_FAMILY,
          size: 22, // 11pt
          bold: true,
          color: COLOR_TEXT,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 160 },
      children: [
        new TextRun({
          text: metaInfo,
          font: FONT_FAMILY,
          size: 19, // 9.5pt
          italics: true,
          color: COLOR_MUTED,
        }),
      ],
    }),
  ];
}

function createSignatureTable(
  kepalaSekolah: string,
  guruPengampu: string,
  kota = 'Semarang',
  tanggal = formatDateIndo()
): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBordersNone,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: cellBordersNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 100, after: 40 },
                children: [
                  new TextRun({
                    text: 'Mengetahui,',
                    font: FONT_FAMILY,
                    size: 20,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 1000 }, // Space for signature
                children: [
                  new TextRun({
                    text: 'Kepala SDIT Al Fikri',
                    font: FONT_FAMILY,
                    size: 20,
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: kepalaSekolah || 'M. Yunus, S.Ag',
                    font: FONT_FAMILY,
                    size: 21,
                    bold: true,
                    underline: {},
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 40 },
                children: [
                  new TextRun({
                    text: 'NIP / NUPTK: .......................................',
                    font: FONT_FAMILY,
                    size: 18,
                    color: COLOR_MUTED,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: cellBordersNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 100, after: 40 },
                children: [
                  new TextRun({
                    text: `${kota}, ${tanggal}`,
                    font: FONT_FAMILY,
                    size: 20,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 1000 }, // Space for signature
                children: [
                  new TextRun({
                    text: 'Guru Mata Pelajaran',
                    font: FONT_FAMILY,
                    size: 20,
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: guruPengampu || 'Guru Pengampu SDIT Al Fikri',
                    font: FONT_FAMILY,
                    size: 21,
                    bold: true,
                    underline: {},
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 40 },
                children: [
                  new TextRun({
                    text: 'NIP / NUPTK: .......................................',
                    font: FONT_FAMILY,
                    size: 18,
                    color: COLOR_MUTED,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function createHeading1(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [
      new TextRun({
        text,
        font: FONT_FAMILY,
        size: 23, // 11.5pt
        bold: true,
        color: COLOR_PRIMARY,
      }),
    ],
  });
}

function createHeading2(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 140, after: 60 },
    children: [
      new TextRun({
        text,
        font: FONT_FAMILY,
        size: 21, // 10.5pt
        bold: true,
        color: COLOR_TEXT,
      }),
    ],
  });
}

function createParagraph(text: string, isItalic = false): Paragraph {
  return new Paragraph({
    spacing: { before: 40, after: 60 },
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({
        text,
        font: FONT_FAMILY,
        size: 20, // 10pt
        italics: isItalic,
        color: COLOR_TEXT,
      }),
    ],
  });
}

function createBulletItem(text: string, prefix = '• '): Paragraph {
  return new Paragraph({
    spacing: { before: 30, after: 40 },
    indent: { left: 400 },
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({
        text: `${prefix}${text}`,
        font: FONT_FAMILY,
        size: 20,
        color: COLOR_TEXT,
      }),
    ],
  });
}

// ==========================================
// 1. EXPORT MODUL AJAR (RPP PLUS) TO WORD (.DOCX)
// ==========================================

export async function exportModulAjarToWord(modul: ModulAjarData): Promise<void> {
  const id = modul.identitas;
  const kompInti = modul.komponenInti;
  const kbm = kompInti.kegiatanPembelajaran;
  const uraian = modul.uraianMateri;

  const docChildren: any[] = [
    ...createKopHeader(
      'MODUL AJAR KURIKULUM MERDEKA',
      `MATA PELAJARAN: ${id.mataPelajaran.toUpperCase()}`,
      `Fase ${id.fase} - ${id.kelas} | Semester: ${id.semester} | Tahun Pelajaran: ${id.tahunPelajaran}`
    ),

    // TABEL IDENTITAS MODUL
    createHeading1('I. INFORMASI UMUM & IDENTITAS MODUL'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: cellBordersAll,
      rows: [
        [
          { label: 'Satuan Pendidikan', val: id.namaSekolah || 'SDIT Al Fikri' },
          { label: 'Tahun Pelajaran', val: id.tahunPelajaran },
        ],
        [
          { label: 'Mata Pelajaran', val: id.mataPelajaran },
          { label: 'Semester', val: id.semester },
        ],
        [
          { label: 'Fase / Kelas', val: `${id.fase} / ${id.kelas}` },
          { label: 'Alokasi Waktu', val: id.alokasiWaktu },
        ],
        [
          { label: 'Bab / Materi Pokok', val: id.babMateri },
          { label: 'Sub-Materi / Topik', val: id.subMateri || '-' },
        ],
        [
          { label: 'Guru Penyusun', val: id.penyusun || 'Guru Pengampu SDIT Al Fikri' },
          { label: 'Kepala Sekolah', val: id.kepalaSekolah || 'M. Yunus, S.Ag' },
        ],
        [
          { label: 'Target Peserta Didik', val: modul.targetPesertaDidik || 'Peserta Didik Reguler (28 Siswa)' },
          { label: 'Model Pembelajaran', val: modul.modelPembelajaran || 'Problem-Based Learning (PBL)' },
        ],
      ].map(
        (row) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 22, type: WidthType.PERCENTAGE },
                shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
                borders: cellBordersAll,
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
                children: [new Paragraph({ children: [new TextRun({ text: row[0].label, font: FONT_FAMILY, size: 19, bold: true })] })],
              }),
              new TableCell({
                width: { size: 28, type: WidthType.PERCENTAGE },
                borders: cellBordersAll,
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
                children: [new Paragraph({ children: [new TextRun({ text: row[0].val, font: FONT_FAMILY, size: 19 })] })],
              }),
              new TableCell({
                width: { size: 22, type: WidthType.PERCENTAGE },
                shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
                borders: cellBordersAll,
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
                children: [new Paragraph({ children: [new TextRun({ text: row[1].label, font: FONT_FAMILY, size: 19, bold: true })] })],
              }),
              new TableCell({
                width: { size: 28, type: WidthType.PERCENTAGE },
                borders: cellBordersAll,
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
                children: [new Paragraph({ children: [new TextRun({ text: row[1].val, font: FONT_FAMILY, size: 19 })] })],
              }),
            ],
          })
      ),
    }),

    // KOMPETENSI AWAL & PROFIL
    createHeading2('A. Kompetensi Awal Prasyarat'),
    createParagraph(modul.kompetensiAwal || 'Peserta didik telah mengenal konsep dasar dan mampu mengamati fenomena kontekstual di lingkungan sekitar.'),

    createHeading2('B. Dimensi Profil Pelajar Pancasila'),
    ...(modul.profilPelajarPancasila || []).map((p) => createBulletItem(p)),

    createHeading2('C. Sarana dan Prasarana'),
    createParagraph(`• Media Pembelajaran : ${(modul.saranaPrasarana?.media || []).join(', ') || 'Buku teks, modul digital, alat peraga konkret, proyektor'}`),
    createParagraph(`• Sumber Belajar    : ${(modul.saranaPrasarana?.sumberBelajar || []).join(', ') || 'Buku Siswa Kemendikbudristek, Al-Quran & Terjemah, lingkungan sekitar'}`),
  ];

  // URAIAN MATERI LENGKAP (TIDAK SINGKAT & TIDAK RANCU)
  if (uraian) {
    docChildren.push(
      createHeading1('II. URAIAN MATERI PEMBELAJARAN (MATERI POKOK LENGKAP)'),
      createHeading2('A. Ringkasan Konsep Materi Esensial'),
      createParagraph(uraian.ringkasanKonsep || `Materi ${id.babMateri} diajarkan secara komprehensif mengacu pada capaian pembelajaran fase ${id.fase}. Konsep ini melatih nalar kritis dan pemahaman peserta didik secara utuh.`)
    );

    if (uraian.poinEsensial && uraian.poinEsensial.length > 0) {
      docChildren.push(
        createHeading2('B. Poin-Poin Kunci Pembelajaran'),
        ...uraian.poinEsensial.map((pe, idx) => createBulletItem(pe, `${idx + 1}. `))
      );
    }

    if (uraian.integrasiKeislaman) {
      docChildren.push(
        createHeading2('C. Integrasi Nilai-Nilai Islam & Adab Khas SDIT'),
        createParagraph(uraian.integrasiKeislaman, true)
      );
    }
  }

  // KOMPONEN INTI
  docChildren.push(
    createHeading1('III. KOMPONEN INTI PEMBELAJARAN'),
    createHeading2('A. Capaian Pembelajaran (CP) Elemen'),
    createParagraph(kompInti.capaianPembelajaran || 'Peserta didik memahami konsep materi esensial secara terpadu dan mampu menerapkannya dalam memecahkan masalah kontekstual.'),

    createHeading2('B. Tujuan Pembelajaran (Kaidah ABCD)'),
    ...(kompInti.tujuanPembelajaran || []).map((tp, idx) => createBulletItem(tp, `${idx + 1}. `)),

    createHeading2('C. Pemahaman Bermakna'),
    createParagraph(kompInti.pemahamanBermakna || `Melalui pembelajaran ini, peserta didik menyadari pentingnya menguasai ${id.babMateri} untuk kemaslahatan hidup dan sebagai wujud syukur atas karunia Allah Swt.`),

    createHeading2('D. Pertanyaan Pemantik'),
    ...(kompInti.pertanyaanPemantik || []).map((q, idx) => createBulletItem(q, `? `)),

    createHeading2('E. Persiapan Pembelajaran Guru'),
    ...(kompInti.persiapanPembelajaran || []).map((p, idx) => createBulletItem(p, `${idx + 1}. `)),

    // SKENARIO KEGIATAN PEMBELAJARAN
    createHeading1('IV. SKENARIO KEGIATAN PEMBELAJARAN'),
    createHeading2(`A. Kegiatan Pendahuluan (Alokasi: ${kbm?.pendahuluan?.durasi || '10 Menit'})`),
    ...(kbm?.pendahuluan?.langkah || []).map((l, idx) => createBulletItem(l, `${idx + 1}. `)),

    createHeading2(`B. Kegiatan Inti (Alokasi: ${kbm?.inti?.durasi || '50 Menit'})`),
    createParagraph(`Model: ${modul.modelPembelajaran || 'Problem-Based Learning'} | Pendekatan: Pembelajaran Bermakna & Berdiferensiasi`),
    ...(kbm?.inti?.langkah || []).map((l, idx) => createBulletItem(l, `${idx + 1}. `))
  );

  if (kbm?.inti?.diferensiasi) {
    docChildren.push(
      createHeading2('Strategi Diferensiasi Pembelajaran:'),
      createParagraph(kbm.inti.diferensiasi)
    );
  }

  docChildren.push(
    createHeading2(`C. Kegiatan Penutup (Alokasi: ${kbm?.penutup?.durasi || '10 Menit'})`),
    ...(kbm?.penutup?.langkah || []).map((l, idx) => createBulletItem(l, `${idx + 1}. `)),

    // ASESMEN & PENILAIAN
    createHeading1('V. ASESMEN DAN INSTRUMEN PENILAIAN'),
    createHeading2('A. Asesmen Diagnostik (Awal KBM)'),
    createParagraph(kompInti.asesmen?.diagnostik || 'Asesmen awal dilakukan secara lisan untuk mengukur kesiapan dan pengetahuan prasyarat murid.')
  );

  if (kompInti.asesmen?.instrumenDiagnostik && kompInti.asesmen.instrumenDiagnostik.length > 0) {
    docChildren.push(
      createHeading2('Daftar Pertanyaan Diagnostik Awal:'),
      ...kompInti.asesmen.instrumenDiagnostik.map((d, i) => createBulletItem(d, `${i + 1}. `))
    );
  }

  docChildren.push(
    createHeading2('B. Asesmen Formatif (Proses KBM) & Rubrik Analitik'),
    createParagraph(kompInti.asesmen?.formatif || 'Observasi keaktifan kelompok, unjuk kerja LKPD, dan penilaian sikap dimensi Profil Pelajar Pancasila.')
  );

  // RUBRIK FORMATIF TABEL
  if (kompInti.asesmen?.rubrikFormatif && kompInti.asesmen.rubrikFormatif.length > 0) {
    const rubrikRows = [
      new TableRow({
        tableHeader: true,
        children: ['No', 'Kriteria Penilaian', 'Skor 4 (Sangat Baik)', 'Skor 3 (Baik)', 'Skor 2 (Cukup)', 'Skor 1 (Bimbingan)'].map(
          (th, i) =>
            new TableCell({
              width: { size: i === 0 ? 6 : i === 1 ? 24 : 17.5, type: WidthType.PERCENTAGE },
              shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
              borders: cellBordersAll,
              margins: { top: 80, bottom: 80, left: 80, right: 80 },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: th, font: FONT_FAMILY, size: 18, bold: true })] })],
            })
        ),
      }),
      ...kompInti.asesmen.rubrikFormatif.map(
        (r, idx) =>
          new TableRow({
            children: [
              new TableCell({
                borders: cellBordersAll,
                margins: { top: 60, bottom: 60, left: 60, right: 60 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${idx + 1}`, font: FONT_FAMILY, size: 18 })] })],
              }),
              new TableCell({
                borders: cellBordersAll,
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({ children: [new TextRun({ text: r.kriteria, font: FONT_FAMILY, size: 18, bold: true })] })],
              }),
              new TableCell({
                borders: cellBordersAll,
                margins: { top: 60, bottom: 60, left: 60, right: 60 },
                children: [new Paragraph({ children: [new TextRun({ text: r.skor4, font: FONT_FAMILY, size: 17 })] })],
              }),
              new TableCell({
                borders: cellBordersAll,
                margins: { top: 60, bottom: 60, left: 60, right: 60 },
                children: [new Paragraph({ children: [new TextRun({ text: r.skor3, font: FONT_FAMILY, size: 17 })] })],
              }),
              new TableCell({
                borders: cellBordersAll,
                margins: { top: 60, bottom: 60, left: 60, right: 60 },
                children: [new Paragraph({ children: [new TextRun({ text: r.skor2, font: FONT_FAMILY, size: 17 })] })],
              }),
              new TableCell({
                borders: cellBordersAll,
                margins: { top: 60, bottom: 60, left: 60, right: 60 },
                children: [new Paragraph({ children: [new TextRun({ text: r.skor1, font: FONT_FAMILY, size: 17 })] })],
              }),
            ],
          })
      ),
    ];

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: cellBordersAll,
        rows: rubrikRows,
      })
    );
  }

  docChildren.push(
    createHeading2('C. Asesmen Sumatif (Akhir Bab)'),
    createParagraph(kompInti.asesmen?.sumatif || 'Tes tertulis / unjuk karya pemahaman komprehensif pada akhir lingkup materi.')
  );

  if (kompInti.asesmen?.soalSumatif && kompInti.asesmen.soalSumatif.length > 0) {
    docChildren.push(
      createHeading2('Contoh Butir Soal Sumatif & Kunci Jawaban:'),
      ...kompInti.asesmen.soalSumatif.flatMap((soal, i) => [
        createParagraph(`Soal ${i + 1} (Bobot: ${soal.skor} Poin):`),
        createBulletItem(soal.butirSoal, '  '),
        createParagraph(`Kunci Jawaban: ${soal.kunciJawaban}`, true),
      ])
    );
  }

  // PENGAYAAN & REMEDIAL
  docChildren.push(
    createHeading1('VI. PENGAYAAN DAN REMEDIAL'),
    createHeading2('A. Kegiatan Pengayaan (Bagi Murid yang Tuntas)'),
    createParagraph(kompInti.pengayaanDanRemedial?.pengayaan || 'Diberikan materi pengembangan dan tugas eksplorasi berbasis proyek mini mandiri.'),
    createHeading2('B. Kegiatan Remedial (Bagi Murid yang Belum Tuntas)'),
    createParagraph(kompInti.pengayaanDanRemedial?.remedial || 'Bimbingan ulang terfokus (scaffolding) dengan menyederhanakan media dan pendampingan tutor sebaya.'),

    // REFLEKSI
    createHeading1('VII. REFLEKSI GURU DAN PESERTA DIDIK'),
    createHeading2('A. Refleksi Guru'),
    ...(kompInti.refleksi?.refleksiGuru || []).map((rg) => createBulletItem(rg, '• ')),
    createHeading2('B. Refleksi Peserta Didik'),
    ...(kompInti.refleksi?.refleksiSiswa || []).map((rs) => createBulletItem(rs, '• ')),

    // LAMPIRAN
    createHeading1('VIII. LAMPIRAN'),
    createHeading2('A. Glosarium'),
    ...(modul.lampiran?.glosarium || []).map((g) => createBulletItem(`${g.istilah} : ${g.arti}`, '• ')),
    createHeading2('B. Daftar Pustaka'),
    ...(modul.lampiran?.daftarPustaka || []).map((dp) => createBulletItem(dp, '• ')),

    // LEMBAR TANDA TANGAN RESMI
    new Paragraph({ spacing: { before: 200, after: 100 }, children: [] }),
    createSignatureTable(id.kepalaSekolah, id.penyusun)
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, // 1 inch / 2.54 cm
          },
        },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanMapel = (id.mataPelajaran || 'Mapel').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanBab = (id.babMateri || 'Materi').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanKls = (id.kelas || 'SD').replace(/\s+/g, '_');
  const filename = `MODUL_AJAR_${cleanMapel}_${cleanKls}_${cleanBab}.docx`;
  triggerDocxDownload(blob, filename);
}

// ==========================================
// 2. EXPORT LKPD TO WORD (.DOCX)
// ==========================================

export async function exportLkpdToWord(lkpd: LkpdData): Promise<void> {
  const id = lkpd.identitas;
  const stimulus = lkpd.stimulusMateri;
  const kunci = lkpd.kunciJawabanDanRubrik;

  const docChildren: any[] = [
    ...createKopHeader(
      'LEMBAR KERJA PESERTA DIDIK (LKPD)',
      id.judulLkpd || `LKPD: ${id.babMateri.toUpperCase()}`,
      `Mata Pelajaran: ${id.mataPelajaran} | ${id.kelas} (${id.fase}) | Alokasi: ${id.alokasiWaktu}`
    ),

    // BOX IDENTITAS KELOMPOK / SISWA
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: cellBordersAll,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 60, type: WidthType.PERCENTAGE },
              borders: cellBordersAll,
              margins: { top: 100, bottom: 100, left: 120, right: 120 },
              children: [
                new Paragraph({ children: [new TextRun({ text: 'Nama Kelompok / Anggota:', font: FONT_FAMILY, size: 20, bold: true })] }),
                new Paragraph({ children: [new TextRun({ text: '1. ................................................................ (Absen: .....)', font: FONT_FAMILY, size: 19 })] }),
                new Paragraph({ children: [new TextRun({ text: '2. ................................................................ (Absen: .....)', font: FONT_FAMILY, size: 19 })] }),
                new Paragraph({ children: [new TextRun({ text: '3. ................................................................ (Absen: .....)', font: FONT_FAMILY, size: 19 })] }),
                new Paragraph({ children: [new TextRun({ text: '4. ................................................................ (Absen: .....)', font: FONT_FAMILY, size: 19 })] }),
                new Paragraph({ children: [new TextRun({ text: '5. ................................................................ (Absen: .....)', font: FONT_FAMILY, size: 19 })] }),
              ],
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              borders: cellBordersAll,
              margins: { top: 100, bottom: 100, left: 120, right: 120 },
              children: [
                new Paragraph({ children: [new TextRun({ text: `Kelas / Fase : ${id.kelas} / ${id.fase}`, font: FONT_FAMILY, size: 19, bold: true })] }),
                new Paragraph({ children: [new TextRun({ text: `Hari / Tanggal: .......................................`, font: FONT_FAMILY, size: 19 })] }),
                new Paragraph({ children: [new TextRun({ text: `Tipe Kegiatan : ${id.tipeAktivitas}`, font: FONT_FAMILY, size: 18 })] }),
                new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: 'Paraf & Catatan Ustadz/Ustadzah:', font: FONT_FAMILY, size: 18, italics: true })] }),
                new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: 'Nilai: [            ]  Paraf: (                   )', font: FONT_FAMILY, size: 20, bold: true })] }),
              ],
            }),
          ],
        }),
      ],
    }),

    // TUJUAN PEMBELAJARAN & PETUNJUK
    createHeading1('A. TUJUAN PEMBELAJARAN'),
    ...(lkpd.tujuanPembelajaran || []).map((t, idx) => createBulletItem(t, `${idx + 1}. `)),

    createHeading1('B. PETUNJUK PENGERJAAN & ADAB BELAJAR'),
    ...(lkpd.petunjukBelajar || []).map((p, idx) => createBulletItem(p, `${idx + 1}. `)),

    // STIMULUS MATERI LENGKAP & KAYA
    createHeading1('C. STIMULUS EKSPLORASI MATERI'),
    createHeading2(stimulus?.judul || `Menemukan Hikmah ${id.babMateri}`),
    createParagraph(stimulus?.teks || `Segala sesuatu diciptakan Allah Swt. dengan ukuran dan hukum yang sangat teratur. Pelajarilah konsep ini dengan cermat.`),
  ];

  if (stimulus?.ceritaAtauKasusKontekstual) {
    docChildren.push(
      createHeading2('Studi Kasus / Cerita Pengamatan Kontekstual:'),
      createParagraph(stimulus.ceritaAtauKasusKontekstual, true)
    );
  }

  if (stimulus?.pertanyaanPemandu && stimulus.pertanyaanPemandu.length > 0) {
    docChildren.push(
      createHeading2('Pertanyaan Pemandu Berpikir Kritis:'),
      ...stimulus.pertanyaanPemandu.map((q, idx) => createBulletItem(q, `? `))
    );
  }

  if (stimulus?.poinPenting && stimulus.poinPenting.length > 0) {
    docChildren.push(
      createHeading2('Poin-Poin Penting Pengamatan:'),
      ...stimulus.poinPenting.map((p, idx) => createBulletItem(p, `• `))
    );
  }

  // EMPAT AKTIVITAS BELAJAR SISWA
  docChildren.push(createHeading1('D. LEMBAR AKTIVITAS PESERTA DIDIK'));

  (lkpd.aktivitas || []).forEach((act) => {
    docChildren.push(
      createHeading2(act.judul || `Aktivitas ${act.nomor}`),
      createParagraph(`Instruksi: ${act.instruksi}`)
    );

    // Render tabel pengamatan jika format jawaban tabel
    if (act.tabelData && act.tabelData.kolom && act.tabelData.kolom.length > 0) {
      const colCount = act.tabelData.kolom.length;
      const colWidthPercent = 100 / colCount;

      const headerRow = new TableRow({
        tableHeader: true,
        children: act.tabelData.kolom.map(
          (c) =>
            new TableCell({
              width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
              shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
              borders: cellBordersAll,
              margins: { top: 80, bottom: 80, left: 80, right: 80 },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: c, font: FONT_FAMILY, size: 19, bold: true })] })],
            })
        ),
      });

      const bodyRows = (act.tabelData.baris || []).map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
                  borders: cellBordersAll,
                  margins: { top: 120, bottom: 120, left: 80, right: 80 }, // Ruang tulis ekstra luas bagi siswa
                  children: [new Paragraph({ children: [new TextRun({ text: cell || '...........................................', font: FONT_FAMILY, size: 18 })] })],
                })
            ),
          })
      );

      docChildren.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: cellBordersAll,
          rows: [headerRow, ...bodyRows],
        })
      );
    }

    // Render pertanyaan isian / analisis
    if (act.soalAtauPertanyaan && act.soalAtauPertanyaan.length > 0) {
      act.soalAtauPertanyaan.forEach((soal, sIdx) => {
        docChildren.push(
          createParagraph(`${sIdx + 1}. ${soal}`),
          new Paragraph({
            spacing: { before: 20, after: 120 },
            children: [
              new TextRun({
                text: '   Jawaban: ..............................................................................................................................................................................',
                font: FONT_FAMILY,
                size: 18,
                color: COLOR_MUTED,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 0, after: 140 },
            children: [
              new TextRun({
                text: '   .........................................................................................................................................................................................',
                font: FONT_FAMILY,
                size: 18,
                color: COLOR_MUTED,
              }),
            ],
          })
        );
      });
    }

    // Ruang jawab / catatan
    if (act.ruangJawab && !act.soalAtauPertanyaan) {
      docChildren.push(
        createParagraph(`Catatan Hasil Kesepakatan Kelompok:`),
        new Paragraph({
          spacing: { before: 40, after: 140 },
          children: [
            new TextRun({
              text: '.........................................................................................................................................................................................\n.........................................................................................................................................................................................',
              font: FONT_FAMILY,
              size: 18,
              color: COLOR_MUTED,
            }),
          ],
        })
      );
    }
  });

  // REFLEKSI DIRI SISWA
  if (lkpd.refleksiDiriSiswa && lkpd.refleksiDiriSiswa.length > 0) {
    docChildren.push(
      createHeading1('E. LEMBAR REFLEKSI DIRI PESERTA DIDIK'),
      createParagraph('Berilah tanda centang (✓) pada kalimat yang sesuai dengan pengalaman belajarmu hari ini:'),
      ...lkpd.refleksiDiriSiswa.map((ref) => createBulletItem(ref, '[   ] '))
    );
  }

  // LEMBAR PANDUAN & KUNCI JAWABAN GURU (PAGE BREAK EKSKLUSIF)
  docChildren.push(
    new Paragraph({ children: [new PageBreak()] }),
    ...createKopHeader(
      'LEMBAR PANDUAN GURU, RUBRIK & KUNCI JAWABAN LKPD',
      `MATA PELAJARAN: ${id.mataPelajaran.toUpperCase()}`,
      `Pegangan Ustadz / Ustadzah (Rahasia & Panduan Asesmen)`
    ),
    createHeading1('I. PANDUAN FASILITASI & SCAFFOLDING GURU'),
    createParagraph(kunci?.panduanGuru || 'Guru berkeliling mengamati dinamika setiap kelompok dan memfasilitasi jalannya penemuan konsep.'),

    createHeading1('II. RUBRIK PENILAIAN ANALITIK KINERJA KELOMPOK')
  );

  if (kunci?.rubrikPenilaian && kunci.rubrikPenilaian.length > 0) {
    const rubrikRows = [
      new TableRow({
        tableHeader: true,
        children: ['Aspek Penilaian', 'Skor 4 (Sangat Baik)', 'Skor 3 (Baik)', 'Skor 2 (Cukup)', 'Skor 1 (Perlu Bimbingan)'].map(
          (th, i) =>
            new TableCell({
              width: { size: i === 0 ? 24 : 19, type: WidthType.PERCENTAGE },
              shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
              borders: cellBordersAll,
              margins: { top: 80, bottom: 80, left: 80, right: 80 },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: th, font: FONT_FAMILY, size: 18, bold: true })] })],
            })
        ),
      }),
      ...kunci.rubrikPenilaian.map(
        (r) =>
          new TableRow({
            children: [
              new TableCell({
                borders: cellBordersAll,
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({ children: [new TextRun({ text: r.aspek, font: FONT_FAMILY, size: 18, bold: true })] })],
              }),
              new TableCell({
                borders: cellBordersAll,
                margins: { top: 60, bottom: 60, left: 60, right: 60 },
                children: [new Paragraph({ children: [new TextRun({ text: r.skor4, font: FONT_FAMILY, size: 17 })] })],
              }),
              new TableCell({
                borders: cellBordersAll,
                margins: { top: 60, bottom: 60, left: 60, right: 60 },
                children: [new Paragraph({ children: [new TextRun({ text: r.skor3, font: FONT_FAMILY, size: 17 })] })],
              }),
              new TableCell({
                borders: cellBordersAll,
                margins: { top: 60, bottom: 60, left: 60, right: 60 },
                children: [new Paragraph({ children: [new TextRun({ text: r.skor2, font: FONT_FAMILY, size: 17 })] })],
              }),
              new TableCell({
                borders: cellBordersAll,
                margins: { top: 60, bottom: 60, left: 60, right: 60 },
                children: [new Paragraph({ children: [new TextRun({ text: r.skor1, font: FONT_FAMILY, size: 17 })] })],
              }),
            ],
          })
      ),
    ];

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: cellBordersAll,
        rows: rubrikRows,
      })
    );
  }

  docChildren.push(createHeading1('III. KUNCI JAWABAN & INDIKATOR JAWABAN TIAP AKTIVITAS'));

  (kunci?.kunciJawabanAktivitas || []).forEach((kj) => {
    docChildren.push(
      createHeading2(`Kunci / Indikator Aktivitas ${kj.nomor}:`),
      createParagraph(kj.jawaban)
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanMapel = (id.mataPelajaran || 'Mapel').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanBab = (id.babMateri || 'Materi').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanKls = (id.kelas || 'SD').replace(/\s+/g, '_');
  const filename = `LKPD_${cleanMapel}_${cleanKls}_${cleanBab}.docx`;
  triggerDocxDownload(blob, filename);
}

// ==========================================
// 3. EXPORT PROGRAM TAHUNAN (PROTA) TO WORD (.DOCX)
// ==========================================

export async function exportProtaToWord(prota: ProtaData): Promise<void> {
  const id = prota.identitas;
  const rincian = prota.rincianMingguEfektif;
  const distribusi = prota.distribusiMateri || [];

  const docChildren: any[] = [
    ...createKopHeader(
      'PROGRAM TAHUNAN (PROTA)',
      `KURIKULUM MERDEKA - ${id.namaSekolah || 'SDIT AL FIKRI'}`,
      `Tahun Pelajaran: ${id.tahunPelajaran} | Fase ${id.fase} - ${id.kelas}`
    ),

    // IDENTITAS PROTA
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: cellBordersAll,
      rows: [
        [
          { label: 'Satuan Pendidikan', val: id.namaSekolah || 'SDIT Al Fikri' },
          { label: 'Tahun Pelajaran', val: id.tahunPelajaran },
        ],
        [
          { label: 'Mata Pelajaran', val: id.mataPelajaran },
          { label: 'Alokasi JP / Pekan', val: `${id.jpPerMinggu} Jam Pelajaran (JP)` },
        ],
        [
          { label: 'Fase / Kelas', val: `${id.fase} / ${id.kelas}` },
          { label: 'Total JP Efektif', val: `${rincian?.totalJPTahunan || 0} JP (${rincian?.totalMingguEfektifTahunan || 0} Pekan Efektif)` },
        ],
        [
          { label: 'Guru Pengampu', val: id.penyusun || 'Guru Pengampu SDIT Al Fikri' },
          { label: 'Kepala Sekolah', val: id.kepalaSekolah || 'M. Yunus, S.Ag' },
        ],
      ].map(
        (row) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 22, type: WidthType.PERCENTAGE },
                shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
                borders: cellBordersAll,
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({ children: [new TextRun({ text: row[0].label, font: FONT_FAMILY, size: 19, bold: true })] })],
              }),
              new TableCell({
                width: { size: 28, type: WidthType.PERCENTAGE },
                borders: cellBordersAll,
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({ children: [new TextRun({ text: row[0].val, font: FONT_FAMILY, size: 19 })] })],
              }),
              new TableCell({
                width: { size: 22, type: WidthType.PERCENTAGE },
                shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
                borders: cellBordersAll,
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({ children: [new TextRun({ text: row[1].label, font: FONT_FAMILY, size: 19, bold: true })] })],
              }),
              new TableCell({
                width: { size: 28, type: WidthType.PERCENTAGE },
                borders: cellBordersAll,
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({ children: [new TextRun({ text: row[1].val, font: FONT_FAMILY, size: 19 })] })],
              }),
            ],
          })
      ),
    }),

    // TABEL RINCIAN ALOKASI MINGGU EFEKTIF
    createHeading1('A. Rincian Alokasi Minggu Efektif Tahunan'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: cellBordersAll,
      rows: [
        new TableRow({
          tableHeader: true,
          children: ['No', 'Semester', 'Jumlah Minggu Kalender', 'Minggu Efektif KBM', 'Total Alokasi JP'].map(
            (th, i) =>
              new TableCell({
                width: { size: i === 0 ? 8 : i === 1 ? 32 : 20, type: WidthType.PERCENTAGE },
                shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
                borders: cellBordersAll,
                margins: { top: 80, bottom: 80, left: 80, right: 80 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: th, font: FONT_FAMILY, size: 19, bold: true })] })],
              })
          ),
        }),
        new TableRow({
          children: [
            new TableCell({ borders: cellBordersAll, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '1', font: FONT_FAMILY, size: 19 })] })] }),
            new TableCell({ borders: cellBordersAll, margins: { left: 80 }, children: [new Paragraph({ children: [new TextRun({ text: 'Semester 1 (Ganjil)', font: FONT_FAMILY, size: 19 })] })] }),
            new TableCell({ borders: cellBordersAll, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${rincian?.semester1?.totalMinggu || 26} Pekan`, font: FONT_FAMILY, size: 19 })] })] }),
            new TableCell({ borders: cellBordersAll, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${rincian?.semester1?.mingguEfektif || 20} Pekan`, font: FONT_FAMILY, size: 19, bold: true })] })] }),
            new TableCell({ borders: cellBordersAll, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${rincian?.semester1?.totalJP || 80} JP`, font: FONT_FAMILY, size: 19, bold: true })] })] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ borders: cellBordersAll, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2', font: FONT_FAMILY, size: 19 })] })] }),
            new TableCell({ borders: cellBordersAll, margins: { left: 80 }, children: [new Paragraph({ children: [new TextRun({ text: 'Semester 2 (Genap)', font: FONT_FAMILY, size: 19 })] })] }),
            new TableCell({ borders: cellBordersAll, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${rincian?.semester2?.totalMinggu || 26} Pekan`, font: FONT_FAMILY, size: 19 })] })] }),
            new TableCell({ borders: cellBordersAll, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${rincian?.semester2?.mingguEfektif || 19} Pekan`, font: FONT_FAMILY, size: 19, bold: true })] })] }),
            new TableCell({ borders: cellBordersAll, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${rincian?.semester2?.totalJP || 76} JP`, font: FONT_FAMILY, size: 19, bold: true })] })] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 2,
              shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
              borders: cellBordersAll,
              margins: { right: 80 },
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'TOTAL 1 TAHUN PELAJARAN:', font: FONT_FAMILY, size: 19, bold: true })] })],
            }),
            new TableCell({
              shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
              borders: cellBordersAll,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '52 Pekan', font: FONT_FAMILY, size: 19, bold: true })] })],
            }),
            new TableCell({
              shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
              borders: cellBordersAll,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${rincian?.totalMingguEfektifTahunan || 39} Pekan`, font: FONT_FAMILY, size: 19, bold: true })] })],
            }),
            new TableCell({
              shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
              borders: cellBordersAll,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${rincian?.totalJPTahunan || 156} JP`, font: FONT_FAMILY, size: 19, bold: true })] })],
            }),
          ],
        }),
      ],
    }),

    // TABEL DISTRIBUSI MATERI POKOK & ALOKASI WAKTU
    createHeading1('B. Distribusi Alokasi Waktu Pembelajaran & Capaian Pembelajaran'),
  ];

  const mainTableHeaders = ['No', 'Smtr', 'Elemen CP', 'Capaian Pembelajaran (CP)', 'Materi Pokok & Tujuan Pembelajaran', 'JP', 'Keterangan'];
  const colWidths = [5, 7, 16, 24, 30, 8, 10];

  const mainRows = [
    new TableRow({
      tableHeader: true,
      children: mainTableHeaders.map(
        (th, i) =>
          new TableCell({
            width: { size: colWidths[i], type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
            borders: cellBordersAll,
            margins: { top: 80, bottom: 80, left: 60, right: 60 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: th, font: FONT_FAMILY, size: 18, bold: true })] })],
          })
      ),
    }),
    ...distribusi.map(
      (item, idx) =>
        new TableRow({
          children: [
            new TableCell({
              borders: cellBordersAll,
              margins: { top: 60, bottom: 60, left: 40, right: 40 },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${item.no || idx + 1}`, font: FONT_FAMILY, size: 18 })] })],
            }),
            new TableCell({
              borders: cellBordersAll,
              margins: { top: 60, bottom: 60, left: 40, right: 40 },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${item.semester || 1}`, font: FONT_FAMILY, size: 18, bold: true })] })],
            }),
            new TableCell({
              borders: cellBordersAll,
              margins: { top: 60, bottom: 60, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: item.elemen || '-', font: FONT_FAMILY, size: 18, bold: true })] })],
            }),
            new TableCell({
              borders: cellBordersAll,
              margins: { top: 60, bottom: 60, left: 60, right: 60 },
              children: [new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: item.capaianPembelajaran || '-', font: FONT_FAMILY, size: 17 })] })],
            }),
            new TableCell({
              borders: cellBordersAll,
              margins: { top: 60, bottom: 60, left: 60, right: 60 },
              children: [
                new Paragraph({ children: [new TextRun({ text: item.materiPokok, font: FONT_FAMILY, size: 18, bold: true })] }),
                new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: item.tujuanPembelajaran, font: FONT_FAMILY, size: 17 })] }),
              ],
            }),
            new TableCell({
              borders: cellBordersAll,
              margins: { top: 60, bottom: 60, left: 40, right: 40 },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${item.alokasiWaktuJP} JP`, font: FONT_FAMILY, size: 18, bold: true })] })],
            }),
            new TableCell({
              borders: cellBordersAll,
              margins: { top: 60, bottom: 60, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: item.keterangan || 'KBM Reguler', font: FONT_FAMILY, size: 17 })] })],
            }),
          ],
        })
    ),
  ];

  docChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: cellBordersAll,
      rows: mainRows,
    }),
    new Paragraph({ spacing: { before: 200, after: 100 }, children: [] }),
    createSignatureTable(id.kepalaSekolah, id.penyusun)
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanMapel = (id.mataPelajaran || 'Mapel').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanKls = (id.kelas || 'SD').replace(/\s+/g, '_');
  const filename = `PROTA_${cleanMapel}_${cleanKls}_${(id.tahunPelajaran || '2025-2026').replace(/[^a-zA-Z0-9]/g, '-')}.docx`;
  triggerDocxDownload(blob, filename);
}

// ==========================================
// 4. EXPORT PROGRAM SEMESTER (PROMES) TO WORD (.DOCX) - LANDSCAPE
// ==========================================

export async function exportPromesToWord(promes: PromesData): Promise<void> {
  const id = promes.identitas;
  const rekap = promes.rekapitulasiAgenda;
  const daftarBulan =
    promes.daftarBulan ||
    ((id.semester || '').toLowerCase().includes('2') || (id.semester || '').toLowerCase().includes('genap')
      ? ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']
      : ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']);
  const alokasi = promes.alokasiMateriDanMinggu || [];

  const docChildren: any[] = [
    ...createKopHeader(
      'PROGRAM SEMESTER (PROMES)',
      `KURIKULUM MERDEKA - ${id.namaSekolah || 'SDIT AL FIKRI'}`,
      `Mata Pelajaran: ${id.mataPelajaran} | ${id.kelas} (${id.fase}) | ${id.semester} | TP ${id.tahunPelajaran}`
    ),

    // IDENTITAS PROMES
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: cellBordersAll,
      rows: [
        [
          { label: 'Satuan Pendidikan', val: id.namaSekolah || 'SDIT Al Fikri' },
          { label: 'Tahun Pelajaran', val: id.tahunPelajaran },
        ],
        [
          { label: 'Mata Pelajaran', val: id.mataPelajaran },
          { label: 'Semester', val: id.semester },
        ],
        [
          { label: 'Fase / Kelas', val: `${id.fase} / ${id.kelas}` },
          { label: 'Alokasi JP / Pekan', val: `${id.jpPerMinggu} JP` },
        ],
        [
          { label: 'Guru Pengampu', val: id.penyusun || 'Guru Pengampu SDIT Al Fikri' },
          { label: 'Kepala Sekolah', val: id.kepalaSekolah || 'M. Yunus, S.Ag' },
        ],
      ].map(
        (row) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 22, type: WidthType.PERCENTAGE },
                shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
                borders: cellBordersAll,
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({ children: [new TextRun({ text: row[0].label, font: FONT_FAMILY, size: 18, bold: true })] })],
              }),
              new TableCell({
                width: { size: 28, type: WidthType.PERCENTAGE },
                borders: cellBordersAll,
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({ children: [new TextRun({ text: row[0].val, font: FONT_FAMILY, size: 18 })] })],
              }),
              new TableCell({
                width: { size: 22, type: WidthType.PERCENTAGE },
                shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
                borders: cellBordersAll,
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({ children: [new TextRun({ text: row[1].label, font: FONT_FAMILY, size: 18, bold: true })] })],
              }),
              new TableCell({
                width: { size: 28, type: WidthType.PERCENTAGE },
                borders: cellBordersAll,
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({ children: [new TextRun({ text: row[1].val, font: FONT_FAMILY, size: 18 })] })],
              }),
            ],
          })
      ),
    }),

    createHeading1('MATRIKS DISTRIBUSI ALOKASI WAKTU MINGGUAN PER BULAN'),
  ];

  // TABEL MATRIKS PROMES (LANDSCAPE)
  // Header Row 1: No, Materi Pokok & Tujuan, JP, [Bulan 1 (5 col)], [Bulan 2 (5 col)], dst, Ket
  const headerRow1 = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        rowSpan: 2,
        width: { size: 4, type: WidthType.PERCENTAGE },
        shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
        borders: cellBordersAll,
        margins: { top: 60, bottom: 60, left: 40, right: 40 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', font: FONT_FAMILY, size: 16, bold: true })] })],
      }),
      new TableCell({
        rowSpan: 2,
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
        borders: cellBordersAll,
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Materi Pokok & Tujuan Pembelajaran', font: FONT_FAMILY, size: 16, bold: true })] })],
      }),
      new TableCell({
        rowSpan: 2,
        width: { size: 5, type: WidthType.PERCENTAGE },
        shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
        borders: cellBordersAll,
        margins: { top: 60, bottom: 60, left: 40, right: 40 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'JP', font: FONT_FAMILY, size: 16, bold: true })] })],
      }),
      ...daftarBulan.map(
        (b) =>
          new TableCell({
            columnSpan: 5,
            width: { size: 9, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
            borders: cellBordersAll,
            margins: { top: 40, bottom: 40, left: 20, right: 20 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: b, font: FONT_FAMILY, size: 15, bold: true })] })],
          })
      ),
      new TableCell({
        rowSpan: 2,
        width: { size: 7, type: WidthType.PERCENTAGE },
        shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
        borders: cellBordersAll,
        margins: { top: 60, bottom: 60, left: 40, right: 40 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Ket', font: FONT_FAMILY, size: 16, bold: true })] })],
      }),
    ],
  });

  // Header Row 2: Pekan 1-5 untuk tiap bulan
  const weekCells: TableCell[] = [];
  daftarBulan.forEach(() => {
    for (let w = 1; w <= 5; w++) {
      weekCells.push(
        new TableCell({
          width: { size: 1.8, type: WidthType.PERCENTAGE },
          shading: { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR },
          borders: cellBordersAll,
          margins: { top: 40, bottom: 40, left: 10, right: 10 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${w}`, font: FONT_FAMILY, size: 14 })] })],
        })
      );
    }
  });

  const headerRow2 = new TableRow({
    tableHeader: true,
    children: weekCells,
  });

  // Data Rows
  const dataRows = alokasi.map(
    (item, idx) =>
      new TableRow({
        children: [
          new TableCell({
            borders: cellBordersAll,
            margins: { top: 40, bottom: 40, left: 20, right: 20 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${item.no || idx + 1}`, font: FONT_FAMILY, size: 15 })] })],
          }),
          new TableCell({
            borders: cellBordersAll,
            margins: { top: 40, bottom: 40, left: 60, right: 60 },
            children: [
              new Paragraph({ children: [new TextRun({ text: item.materiPokok, font: FONT_FAMILY, size: 16, bold: true })] }),
              new Paragraph({ spacing: { before: 20 }, children: [new TextRun({ text: item.tujuanPembelajaran, font: FONT_FAMILY, size: 15 })] }),
            ],
          }),
          new TableCell({
            borders: cellBordersAll,
            margins: { top: 40, bottom: 40, left: 20, right: 20 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${item.alokasiJP}`, font: FONT_FAMILY, size: 16, bold: true })] })],
          }),
          // 30 Pekan Matrix Cells (6 bulan x 5 pekan)
          ...(daftarBulan.flatMap((bln) => {
            const weeks = item.matriksMingguan?.[bln] || ['', '', '', '', ''];
            const cellsInMonth: TableCell[] = [];
            for (let w = 0; w < 5; w++) {
              const val = weeks[w];
              const cellText = val !== '' && val !== null && val !== undefined ? String(val) : '';
              cellsInMonth.push(
                new TableCell({
                  borders: cellBordersAll,
                  margins: { top: 40, bottom: 40, left: 10, right: 10 },
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: cellText, font: FONT_FAMILY, size: 14, bold: Boolean(cellText) })] })],
                })
              );
            }
            return cellsInMonth;
          })),
          new TableCell({
            borders: cellBordersAll,
            margins: { top: 40, bottom: 40, left: 40, right: 40 },
            children: [new Paragraph({ children: [new TextRun({ text: item.keterangan || '-', font: FONT_FAMILY, size: 15 })] })],
          }),
        ],
      })
  );

  docChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: cellBordersAll,
      rows: [headerRow1, headerRow2, ...dataRows],
    }),
    new Paragraph({ spacing: { before: 200, after: 100 }, children: [] }),
    createSignatureTable(id.kepalaSekolah, id.penyusun)
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 },
          },
        },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanMapel = (id.mataPelajaran || 'Mapel').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanKls = (id.kelas || 'SD').replace(/\s+/g, '_');
  const filename = `PROMES_${cleanMapel}_${cleanKls}_${(id.semester || 'Semester').replace(/\s+/g, '_')}_${(id.tahunPelajaran || '2025-2026').replace(/[^a-zA-Z0-9]/g, '-')}.docx`;
  triggerDocxDownload(blob, filename);
}
