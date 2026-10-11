import { ProtaData } from '../components/administrasi/ProtaGeneratorModal';
import { PromesData } from '../components/administrasi/PromesGeneratorModal';
import {
  exportProtaToWord as exportProtaToWordDocx,
  exportPromesToWord as exportPromesToWordDocx,
} from '../services/administrasiWordExportService';

/**
 * Helper utility to export PROTA and PROMES to Microsoft Word (.docx)
 * with pristine formatting, clean table borders, side-by-side signature tables,
 * and correct page orientation (Portrait for Prota, Landscape for Promes).
 */

export async function exportProtaToWord(prota: ProtaData) {
  try {
    await exportProtaToWordDocx(prota);
  } catch (err) {
    console.error('Fallback to legacy HTML doc export for Prota:', err);
    exportProtaToWordLegacy(prota);
  }
}

export async function exportPromesToWord(promes: PromesData) {
  try {
    await exportPromesToWordDocx(promes);
  } catch (err) {
    console.error('Fallback to legacy HTML doc export for Promes:', err);
    exportPromesToWordLegacy(promes);
  }
}

function triggerWordDownload(filename: string, htmlContent: string) {
  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword;charset=utf-8',
  });
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
// 1. LEGACY EXPORT PROGRAM TAHUNAN (PROTA)
// ==========================================
function exportProtaToWordLegacy(prota: ProtaData) {
  const id = prota.identitas;
  const rincian = prota.rincianMingguEfektif;
  const distribusi = prota.distribusiMateri || [];

  const filename = `PROTA_${(id.mataPelajaran || 'Mapel').replace(/[^a-zA-Z0-9]/g, '_')}_${(id.kelas || 'SD').replace(/\s+/g, '_')}_${(id.tahunPelajaran || '2025-2026').replace(/[^a-zA-Z0-9]/g, '-')}.doc`;

  const rowsHtml = distribusi
    .map((item, idx) => {
      const isSemHeader = item.materiPokok?.toLowerCase().includes('semester 2') && idx > 0;
      return `
        <tr style="mso-yfti-irow: ${idx + 1};">
          <td style="border: 0.5pt solid black; text-align: center; vertical-align: top; padding: 5pt 4pt; font-size: 9.5pt;">${item.no || idx + 1}</td>
          <td style="border: 0.5pt solid black; text-align: center; vertical-align: top; padding: 5pt 4pt; font-size: 9.5pt; font-weight: bold;">Smtr ${item.semester || 1}</td>
          <td style="border: 0.5pt solid black; vertical-align: top; padding: 5pt 6pt; font-size: 9.5pt;">
            <b>${item.elemen || '-'}</b>
          </td>
          <td style="border: 0.5pt solid black; vertical-align: top; padding: 5pt 6pt; font-size: 9pt; text-align: justify; line-height: 1.25;">
            ${item.capaianPembelajaran || '-'}
          </td>
          <td style="border: 0.5pt solid black; vertical-align: top; padding: 5pt 6pt; font-size: 9.5pt; line-height: 1.25;">
            <div style="font-weight: bold; color: #1e3a8a; margin-bottom: 2pt;">${item.materiPokok}</div>
            <div style="font-size: 9pt; color: #222;">${item.tujuanPembelajaran}</div>
          </td>
          <td style="border: 0.5pt solid black; text-align: center; vertical-align: top; padding: 5pt 4pt; font-size: 9.5pt; font-weight: bold; color: #0f766e;">
            ${item.alokasiWaktuJP} JP
          </td>
          <td style="border: 0.5pt solid black; vertical-align: top; padding: 5pt 6pt; font-size: 8.5pt; color: #374151; line-height: 1.2;">
            ${item.keterangan || 'KBM Tatap Muka Terbimbing & Asesmen Formatif'}
          </td>
        </tr>
      `;
    })
    .join('');

  const wordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Program Tahunan - ${id.mataPelajaran}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 210mm 297mm; /* A4 Portrait */
          margin: 20mm 15mm 20mm 15mm;
          mso-page-orientation: portrait;
          mso-header-margin: 10mm;
          mso-footer-margin: 10mm;
        }
        div.Section1 { page: Section1; }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 10pt;
          line-height: 1.3;
          color: #000000;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
        .header-kop {
          text-align: center;
          margin-bottom: 12pt;
        }
        .kop-title {
          font-size: 13pt;
          font-weight: bold;
          text-transform: uppercase;
          margin: 0;
          letter-spacing: 0.5pt;
        }
        .kop-sub {
          font-size: 11pt;
          font-weight: bold;
          margin: 2pt 0 0 0;
          text-transform: uppercase;
        }
        .kop-info {
          font-size: 9.5pt;
          margin: 2pt 0 6pt 0;
        }
        .hr-kop {
          border: 0;
          border-top: 1.5pt solid #000;
          border-bottom: 0.5pt solid #000;
          height: 3pt;
          margin: 4pt 0 12pt 0;
        }
        .info-table td {
          padding: 2pt 4pt;
          font-size: 9.5pt;
          vertical-align: top;
        }
        .main-table th {
          border: 0.5pt solid black;
          background-color: #f1f5f9;
          font-weight: bold;
          font-size: 9.5pt;
          padding: 6pt 4pt;
          text-align: center;
        }
        .ttd-table {
          width: 100%;
          border: none;
          margin-top: 20pt;
        }
        .ttd-table td {
          border: none;
          width: 50%;
          text-align: center;
          font-size: 10pt;
          vertical-align: top;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <!-- KOP DOKUMEN RESMI -->
        <div class="header-kop">
          <p class="kop-title">PROGRAM TAHUNAN (PROTA)</p>
          <p class="kop-sub">KURIKULUM MERDEKA - ${id.namaSekolah || 'SDIT AL FIKRI'}</p>
          <p class="kop-info">Tahun Pelajaran: ${id.tahunPelajaran} | Fase ${id.fase} - ${id.kelas}</p>
          <div class="hr-kop"></div>
        </div>

        <!-- TABEL IDENTITAS -->
        <table class="info-table" style="margin-bottom: 12pt;">
          <tr>
            <td style="width: 18%; font-weight: bold;">Satuan Pendidikan</td>
            <td style="width: 2%;">:</td>
            <td style="width: 35%;">${id.namaSekolah || 'SDIT Al Fikri'}</td>
            <td style="width: 18%; font-weight: bold;">Tahun Pelajaran</td>
            <td style="width: 2%;">:</td>
            <td style="width: 25%;">${id.tahunPelajaran}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Mata Pelajaran</td>
            <td>:</td>
            <td>${id.mataPelajaran}</td>
            <td style="font-weight: bold;">Alokasi JP / Minggu</td>
            <td>:</td>
            <td>${id.jpPerMinggu} Jam Pelajaran (JP)</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Fase / Kelas</td>
            <td>:</td>
            <td>${id.fase} / ${id.kelas}</td>
            <td style="font-weight: bold;">Total JP Efektif</td>
            <td>:</td>
            <td>${rincian?.totalJPTahunan || 0} JP (${rincian?.totalMingguEfektifTahunan || 0} Pekan)</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Guru Pengampu</td>
            <td>:</td>
            <td>${id.penyusun || '-'}</td>
            <td style="font-weight: bold;">Kepala Sekolah</td>
            <td>:</td>
            <td>${id.kepalaSekolah || '-'}</td>
          </tr>
          ${
            id.modeAcuan
              ? `<tr>
            <td style="font-weight: bold;">Acuan Penyusunan</td>
            <td>:</td>
            <td colspan="4">${
              id.modeAcuan === 'buku_paket'
                ? 'Daftar Bab Buku Pegangan Guru / Siswa'
                : 'Capaian Pembelajaran Standar Nasional (BSKAP 046/H/KR/2025)'
            }</td>
          </tr>`
              : ''
          }
        </table>

        <!-- TABEL RINCIAN ALOKASI MINGGU EFEKTIF TAHUNAN -->
        <div style="font-weight: bold; font-size: 10pt; margin-bottom: 4pt; color: #1e293b;">
          A. Rincian Alokasi Minggu Efektif Tahunan
        </div>
        <table border="1" cellspacing="0" cellpadding="4" style="border: 0.5pt solid black; margin-bottom: 14pt; font-size: 9.5pt; text-align: center;">
          <tr style="background-color: #f8fafc; font-weight: bold;">
            <th style="border: 0.5pt solid black; width: 6%;">No</th>
            <th style="border: 0.5pt solid black; width: 28%; text-align: left; padding-left: 6pt;">Semester</th>
            <th style="border: 0.5pt solid black; width: 22%;">Jumlah Minggu Kalender</th>
            <th style="border: 0.5pt solid black; width: 22%;">Minggu Efektif KBM</th>
            <th style="border: 0.5pt solid black; width: 22%;">Total Alokasi JP</th>
          </tr>
          <tr>
            <td style="border: 0.5pt solid black;">1</td>
            <td style="border: 0.5pt solid black; text-align: left; padding-left: 6pt;">Semester 1 (Ganjil)</td>
            <td style="border: 0.5pt solid black;">${rincian?.semester1?.totalMinggu || 26} Minggu</td>
            <td style="border: 0.5pt solid black; font-weight: bold;">${rincian?.semester1?.mingguEfektif || 20} Minggu</td>
            <td style="border: 0.5pt solid black; font-weight: bold; color: #0f766e;">${rincian?.semester1?.totalJP || 80} JP</td>
          </tr>
          <tr>
            <td style="border: 0.5pt solid black;">2</td>
            <td style="border: 0.5pt solid black; text-align: left; padding-left: 6pt;">Semester 2 (Genap)</td>
            <td style="border: 0.5pt solid black;">${rincian?.semester2?.totalMinggu || 26} Minggu</td>
            <td style="border: 0.5pt solid black; font-weight: bold;">${rincian?.semester2?.mingguEfektif || 19} Minggu</td>
            <td style="border: 0.5pt solid black; font-weight: bold; color: #0f766e;">${rincian?.semester2?.totalJP || 76} JP</td>
          </tr>
          <tr style="background-color: #f1f5f9; font-weight: bold;">
            <td colspan="2" style="border: 0.5pt solid black; text-align: right; padding-right: 8pt;">TOTAL KESELURUHAN 1 TAHUN:</td>
            <td style="border: 0.5pt solid black;">52 Minggu</td>
            <td style="border: 0.5pt solid black; color: #1e3a8a;">${rincian?.totalMingguEfektifTahunan || 39} Minggu</td>
            <td style="border: 0.5pt solid black; color: #0f766e;">${rincian?.totalJPTahunan || 156} JP</td>
          </tr>
        </table>

        <!-- TABEL DISTRIBUSI MATERI PROTA -->
        <div style="font-weight: bold; font-size: 10pt; margin-bottom: 4pt; color: #1e293b;">
          B. Distribusi Alokasi Waktu Materi Pokok & Tujuan Pembelajaran
        </div>
        <table class="main-table" border="1" cellspacing="0" cellpadding="4" style="border: 0.5pt solid black; margin-bottom: 16pt;">
          <thead>
            <tr style="background-color: #f1f5f9; mso-yfti-tblheader: yes;">
              <th style="border: 0.5pt solid black; width: 4%;">No</th>
              <th style="border: 0.5pt solid black; width: 6%;">Smtr</th>
              <th style="border: 0.5pt solid black; width: 15%;">Elemen</th>
              <th style="border: 0.5pt solid black; width: 25%;">Capaian Pembelajaran (CP)</th>
              <th style="border: 0.5pt solid black; width: 28%;">Tujuan Pembelajaran (TP) & Pokok Bahasan</th>
              <th style="border: 0.5pt solid black; width: 7%;">Alokasi</th>
              <th style="border: 0.5pt solid black; width: 15%;">Keterangan & Strategi KBM</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background-color: #f1f5f9; font-weight: bold;">
              <td colspan="5" style="border: 0.5pt solid black; text-align: right; padding-right: 8pt; font-size: 9.5pt;">
                TOTAL ALOKASI WAKTU TAHUNAN:
              </td>
              <td style="border: 0.5pt solid black; text-align: center; color: #0f766e; font-size: 10pt;">
                ${rincian?.totalJPTahunan || 156} JP
              </td>
              <td style="border: 0.5pt solid black; font-size: 8.5pt; color: #475569; padding: 4pt 6pt;">
                ${rincian?.totalMingguEfektifTahunan || 39} Pekan Efektif KBM Terjadwal
              </td>
            </tr>
          </tfoot>
        </table>

        <!-- LEMBAR TANDA TANGAN PENGESAHAN (SIDE-BY-SIDE TABLE BERGARANSI DI MS WORD) -->
        <table class="ttd-table" cellspacing="0" cellpadding="0">
          <tr>
            <td style="width: 50%; text-align: center;">
              <p style="margin: 0;">Mengetahui,</p>
              <p style="margin: 2pt 0 0 0; font-weight: bold;">Kepala ${id.namaSekolah || 'SDIT Al Fikri'}</p>
              <div style="height: 50pt;"></div>
              <p style="margin: 0; font-weight: bold; text-decoration: underline; text-transform: uppercase;">
                ${id.kepalaSekolah || 'M. Yunus, S.Ag'}
              </p>
              <p style="margin: 2pt 0 0 0; font-size: 9pt; color: #555;">NIP/NIY: .......................................</p>
            </td>
            <td style="width: 50%; text-align: center;">
              <p style="margin: 0;">Depok, ${formatDateIndo()}</p>
              <p style="margin: 2pt 0 0 0; font-weight: bold;">Guru Pengampu Mata Pelajaran</p>
              <div style="height: 50pt;"></div>
              <p style="margin: 0; font-weight: bold; text-decoration: underline; text-transform: uppercase;">
                ${id.penyusun || 'Guru Pengampu'}
              </p>
              <p style="margin: 2pt 0 0 0; font-size: 9pt; color: #555;">NIP/NIY: .......................................</p>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  triggerWordDownload(filename, wordHtml);
}

// ==========================================
// 2. LEGACY EXPORT PROGRAM SEMESTER (PROMES)
// ==========================================
function exportPromesToWordLegacy(promes: PromesData) {
  const id = promes.identitas;
  const daftarBulan = promes.daftarBulan || ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const alokasi = promes.alokasiMateriDanMinggu || [];
  const rekap = promes.rekapitulasiAgenda;

  const filename = `PROMES_${(id.mataPelajaran || 'Mapel').replace(/[^a-zA-Z0-9]/g, '_')}_${(id.kelas || 'SD').replace(/\s+/g, '_')}_${(id.semester || 'Sem').replace(/[^a-zA-Z0-9]/g, '_')}.doc`;

  // Generate table rows
  const rowsHtml = alokasi
    .map((item, idx) => {
      const isSpecial =
        item.materiPokok?.includes('STS') ||
        item.materiPokok?.includes('SAS') ||
        item.materiPokok?.includes('SAT') ||
        item.materiPokok?.includes('Cadangan');

      const rowBg = isSpecial ? 'background-color: #fef3c7;' : '';

      // Generate week columns (5 weeks per month = 30 week columns)
      const weekColsHtml = daftarBulan
        .map((bln) => {
          const weeks = item.matriksMingguan?.[bln] || ['', '', '', '', ''];
          return [0, 1, 2, 3, 4]
            .map((wIdx) => {
              const val = weeks[wIdx];
              const hasVal = val !== '' && val !== null && val !== undefined && val !== 0;
              const isBadge = typeof val === 'string' && val.trim().length > 0 && isNaN(Number(val));

              let cellBg = '';
              let textColor = '#000';
              if (hasVal) {
                if (isBadge) {
                  cellBg = 'background-color: #fed7aa; font-weight: bold; color: #9a3412;';
                } else {
                  cellBg = 'background-color: #ccfbf1; font-weight: bold; color: #0f766e;';
                }
              }

              return `
                <td style="border: 0.5pt solid black; text-align: center; font-size: 8pt; padding: 2pt 1pt; width: 14pt; ${cellBg}">
                  ${hasVal ? val : ''}
                </td>
              `;
            })
            .join('');
        })
        .join('');

      return `
        <tr style="${rowBg} mso-yfti-irow: ${idx + 1};">
          <td style="border: 0.5pt solid black; text-align: center; vertical-align: top; padding: 4pt 2pt; font-size: 8.5pt;">${item.no || idx + 1}</td>
          <td style="border: 0.5pt solid black; vertical-align: top; padding: 4pt 5pt; font-size: 8.5pt;">
            <div style="font-weight: bold; color: #1e3a8a;">${item.materiPokok}</div>
            <div style="font-size: 7.5pt; color: #475569; margin-top: 1pt;">${item.tujuanPembelajaran}</div>
          </td>
          <td style="border: 0.5pt solid black; text-align: center; vertical-align: top; padding: 4pt 2pt; font-size: 8.5pt; font-weight: bold; color: #0f766e;">
            ${item.alokasiJP}
          </td>
          ${weekColsHtml}
          <td style="border: 0.5pt solid black; vertical-align: top; padding: 4pt 4pt; font-size: 7.5pt; color: #4b5563;">
            ${(item as any).keterangan || (isSpecial ? 'Jadwal Asesmen Terprogram' : 'KBM Efektif & Formatif')}
          </td>
        </tr>
      `;
    })
    .join('');

  const wordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Program Semester - ${id.mataPelajaran}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 297mm 210mm; /* A4 Landscape */
          margin: 14mm 10mm 14mm 10mm;
          mso-page-orientation: landscape;
          mso-header-margin: 8mm;
          mso-footer-margin: 8mm;
        }
        div.Section1 { page: Section1; }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 9pt;
          line-height: 1.25;
          color: #000000;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
        .header-kop {
          text-align: center;
          margin-bottom: 8pt;
        }
        .kop-title {
          font-size: 13pt;
          font-weight: bold;
          text-transform: uppercase;
          margin: 0;
          letter-spacing: 0.5pt;
        }
        .kop-sub {
          font-size: 10.5pt;
          font-weight: bold;
          margin: 2pt 0 0 0;
          text-transform: uppercase;
        }
        .kop-info {
          font-size: 9pt;
          margin: 2pt 0 4pt 0;
        }
        .hr-kop {
          border: 0;
          border-top: 1.5pt solid #000;
          border-bottom: 0.5pt solid #000;
          height: 3pt;
          margin: 3pt 0 8pt 0;
        }
        .info-table td {
          padding: 1.5pt 3pt;
          font-size: 8.5pt;
          vertical-align: top;
        }
        .matrix-table th {
          border: 0.5pt solid black;
          background-color: #f1f5f9;
          font-weight: bold;
          font-size: 8pt;
          padding: 3pt 1pt;
          text-align: center;
        }
        .ttd-table {
          width: 100%;
          border: none;
          margin-top: 14pt;
        }
        .ttd-table td {
          border: none;
          width: 50%;
          text-align: center;
          font-size: 9.5pt;
          vertical-align: top;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <!-- KOP RESMI PROMES -->
        <div class="header-kop">
          <p class="kop-title">PROGRAM SEMESTER (PROMES)</p>
          <p class="kop-sub">KURIKULUM MERDEKA - ${id.namaSekolah || 'SDIT AL FIKRI'}</p>
          <p class="kop-info">Tahun Pelajaran: ${id.tahunPelajaran} | ${id.semester} | Fase ${id.fase} - ${id.kelas}</p>
          <div class="hr-kop"></div>
        </div>

        <!-- TABEL IDENTITAS PROMES -->
        <table class="info-table" style="margin-bottom: 8pt;">
          <tr>
            <td style="width: 15%; font-weight: bold;">Satuan Pendidikan</td>
            <td style="width: 1.5%;">:</td>
            <td style="width: 33%;">${id.namaSekolah || 'SDIT Al Fikri'}</td>
            <td style="width: 15%; font-weight: bold;">Tahun Pelajaran</td>
            <td style="width: 1.5%;">:</td>
            <td style="width: 34%;">${id.tahunPelajaran}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Mata Pelajaran</td>
            <td>:</td>
            <td>${id.mataPelajaran}</td>
            <td style="font-weight: bold;">Semester / Kelas</td>
            <td>:</td>
            <td>${id.semester} / ${id.kelas} (${id.fase})</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Alokasi JP / Minggu</td>
            <td>:</td>
            <td>${id.jpPerMinggu} Jam Pelajaran (JP)</td>
            <td style="font-weight: bold;">Total Alokasi Semester</td>
            <td>:</td>
            <td>${rekap?.totalSemesterJP || id.totalJP || 0} JP (${id.totalMingguEfektif || 18} Pekan Efektif)</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Guru Pengampu</td>
            <td>:</td>
            <td>${id.penyusun || '-'}</td>
            <td style="font-weight: bold;">Kepala Sekolah</td>
            <td>:</td>
            <td>${id.kepalaSekolah || '-'}</td>
          </tr>
          ${
            id.modeAcuan
              ? `<tr>
            <td style="font-weight: bold;">Acuan Pembelajaran</td>
            <td>:</td>
            <td colspan="4">${
              id.modeAcuan === 'buku_paket'
                ? 'Daftar Bab Buku Paket Pegangan Guru / Siswa'
                : 'Capaian Pembelajaran Kurikulum Nasional (BSKAP 046/H/KR/2025)'
            }</td>
          </tr>`
              : ''
          }
        </table>

        <!-- MATRIKS PROMES 6 BULAN (LANDSCAPE) -->
        <table class="matrix-table" border="1" cellspacing="0" cellpadding="2" style="border: 0.5pt solid black; margin-bottom: 10pt;">
          <thead>
            <!-- HEADER BARIS 1: NAMA BULAN -->
            <tr style="background-color: #f1f5f9; mso-yfti-tblheader: yes;">
              <th rowspan="2" style="border: 0.5pt solid black; width: 2.5%;">No</th>
              <th rowspan="2" style="border: 0.5pt solid black; width: 28%; text-align: left; padding-left: 4pt;">
                Tujuan Pembelajaran (TP) & Pokok Bahasan
              </th>
              <th rowspan="2" style="border: 0.5pt solid black; width: 3.5%;">JP</th>
              ${daftarBulan
                .map(
                  (bln) => `
                <th colspan="5" style="border: 0.5pt solid black; background-color: #e0f2fe; color: #0369a1; font-weight: bold; font-size: 8pt; padding: 2.5pt 1pt;">
                  ${bln.toUpperCase()}
                </th>
              `
                )
                .join('')}
              <th rowspan="2" style="border: 0.5pt solid black; width: 12%;">Keterangan & Catatan</th>
            </tr>
            <!-- HEADER BARIS 2: MINGGU KE 1..5 -->
            <tr style="background-color: #f8fafc; font-size: 7.5pt; mso-yfti-tblheader: yes;">
              ${daftarBulan
                .map(
                  () => `
                <th style="border: 0.5pt solid black; width: 1.8%;">1</th>
                <th style="border: 0.5pt solid black; width: 1.8%;">2</th>
                <th style="border: 0.5pt solid black; width: 1.8%;">3</th>
                <th style="border: 0.5pt solid black; width: 1.8%;">4</th>
                <th style="border: 0.5pt solid black; width: 1.8%;">5</th>
              `
                )
                .join('')}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background-color: #f1f5f9; font-weight: bold;">
              <td colspan="2" style="border: 0.5pt solid black; text-align: right; padding-right: 6pt; font-size: 8.5pt;">
                TOTAL ALOKASI JP SEMESTER:
              </td>
              <td style="border: 0.5pt solid black; text-align: center; color: #0f766e; font-size: 9pt;">
                ${rekap?.totalSemesterJP || id.totalJP || 0}
              </td>
              <td colspan="${daftarBulan.length * 5 + 1}" style="border: 0.5pt solid black; text-align: left; padding-left: 6pt; font-size: 8pt; color: #334155;">
                Rekap: KBM Efektif: ${rekap?.kbmEfektifJP || 0} JP | STS: ${rekap?.asesmenTengahSemesterJP || 0} JP | SAS/SAT: ${rekap?.asesmenAkhirSemesterJP || 0} JP | Cadangan: ${rekap?.cadanganDanRemedialJP || 0} JP
              </td>
            </tr>
          </tfoot>
        </table>

        <!-- LEMBAR TANDA TANGAN (SIDE-BY-SIDE GUARANTEED) -->
        <table class="ttd-table" cellspacing="0" cellpadding="0">
          <tr>
            <td style="width: 50%; text-align: center;">
              <p style="margin: 0;">Mengetahui,</p>
              <p style="margin: 2pt 0 0 0; font-weight: bold;">Kepala ${id.namaSekolah || 'SDIT Al Fikri'}</p>
              <div style="height: 40pt;"></div>
              <p style="margin: 0; font-weight: bold; text-decoration: underline; text-transform: uppercase;">
                ${id.kepalaSekolah || 'M. Yunus, S.Ag'}
              </p>
              <p style="margin: 2pt 0 0 0; font-size: 8.5pt; color: #555;">NIP/NIY: .......................................</p>
            </td>
            <td style="width: 50%; text-align: center;">
              <p style="margin: 0;">Depok, ${formatDateIndo()}</p>
              <p style="margin: 2pt 0 0 0; font-weight: bold;">Guru Pengampu Mata Pelajaran</p>
              <div style="height: 40pt;"></div>
              <p style="margin: 0; font-weight: bold; text-decoration: underline; text-transform: uppercase;">
                ${id.penyusun || 'Guru Pengampu'}
              </p>
              <p style="margin: 2pt 0 0 0; font-size: 8.5pt; color: #555;">NIP/NIY: .......................................</p>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  triggerWordDownload(filename, wordHtml);
}
