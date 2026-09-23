import { ActiveExamSchedule, DEFAULT_EXAM_ROOMS, DEFAULT_PROCTOR_CODES } from '../types';

/**
 * Membuka jendela cetak atau mengunduh dokumen HTML mandiri siap cetak/simpan PDF
 */
export function printOrDownloadExamScheduleDoc(schedule: ActiveExamSchedule) {
  const rooms = schedule.rooms && schedule.rooms.length > 0 ? schedule.rooms : DEFAULT_EXAM_ROOMS;
  const proctors = schedule.proctorCodes && schedule.proctorCodes.length > 0 ? schedule.proctorCodes : DEFAULT_PROCTOR_CODES;
  const rows = schedule.rows || [];

  const proctorCodeMap = proctors.reduce((acc, p) => {
    acc[p.code.toUpperCase()] = p.name;
    return acc;
  }, {} as Record<string, string>);

  // Hitung total sesi per pengawas
  const dutyCounts: Record<string, number> = {};
  proctors.forEach((p) => {
    dutyCounts[p.code.toUpperCase()] = 0;
  });

  rows.forEach((row) => {
    if (row.roomCodes) {
      Object.values(row.roomCodes).forEach((code) => {
        const c = (code || '').trim().toUpperCase();
        if (c && c !== '—' && c !== '-') {
          dutyCounts[c] = (dutyCounts[c] || 0) + 1;
        }
      });
    }
  });

  // Susun baris tabel jadwal
  const tableRowsHtml = rows
    .map((row, idx) => {
      const roomCellsHtml = rooms
        .map((rm, rmIdx) => {
          const codeVal = row.roomCodes?.[rm] || '—';
          const isBorderRight = rm.toUpperCase().endsWith('B') || rmIdx === rooms.length - 1;
          const borderStyle = isBorderRight ? 'border-right: 2px solid #000;' : 'border-right: 1px solid #ccc;';
          return `<td style="text-align: center; font-weight: bold; padding: 6px 2px; ${borderStyle} font-size: 11px;">${codeVal}</td>`;
        })
        .join('');

      return `
        <tr style="border-bottom: 1px solid #ccc;">
          <td style="text-align: center; padding: 6px; font-size: 11px; border-right: 1px solid #ccc;">${idx + 1}</td>
          <td style="padding: 6px; font-weight: bold; font-size: 11px; border-right: 1px solid #ccc;">
            ${row.day}<br/><span style="font-weight: normal; font-size: 10px; color: #555;">${row.date || ''}</span>
          </td>
          <td style="padding: 6px; font-size: 11px; border-right: 1px solid #ccc; white-space: nowrap;">${row.session}</td>
          <td style="padding: 6px; font-size: 11px; border-right: 1px solid #000;">
            <strong>${row.subject}</strong>
            <div style="font-size: 10px; color: #444;">${row.classes || 'Kelas 1–6'} ${row.notes ? `<em>(${row.notes})</em>` : ''}</div>
          </td>
          ${roomCellsHtml}
        </tr>
      `;
    })
    .join('');

  // Susun header ruang
  const roomHeadersHtml = rooms
    .map((rm, rmIdx) => {
      const isBorderRight = rm.toUpperCase().endsWith('B') || rmIdx === rooms.length - 1;
      const borderStyle = isBorderRight ? 'border-right: 2px solid #000;' : 'border-right: 1px solid #ccc;';
      return `<th style="padding: 6px 2px; text-align: center; width: 34px; font-size: 11px; background-color: #f1f5f9; ${borderStyle}">${rm}</th>`;
    })
    .join('');

  // Susun daftar legenda guru pengawas (2 kolom)
  const half = Math.ceil(proctors.length / 2);
  const leftProctors = proctors.slice(0, half);
  const rightProctors = proctors.slice(half);

  const renderProctorCol = (items: typeof proctors) => {
    return items
      .map(
        (p) => `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 4px 8px; width: 40px; font-weight: bold; text-align: center; border-right: 1px solid #eee; background-color: #f8fafc; font-size: 11px;">${p.code}</td>
          <td style="padding: 4px 8px; font-size: 11px; border-right: 1px solid #eee;">${p.name}</td>
          <td style="padding: 4px 8px; width: 50px; text-align: center; font-size: 11px; font-weight: bold;">${dutyCounts[p.code.toUpperCase()] || 0}</td>
        </tr>
      `
      )
      .join('');
  };

  const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${schedule.examHeaderTitle || 'Jadwal Ujian SDIT AL FIKRI'}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm 10mm 10mm 10mm;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 12px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header-box {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .header-title {
      font-size: 15px;
      font-weight: 900;
      text-transform: uppercase;
      margin: 0;
      letter-spacing: 0.5px;
    }
    .header-sub {
      font-size: 12px;
      font-weight: bold;
      margin-top: 2px;
      color: #222;
    }
    .header-meta {
      font-size: 11px;
      margin-top: 4px;
      color: #333;
    }
    table.schedule-table {
      width: 100%;
      border-collapse: collapse;
      border: 2px solid #000;
      margin-bottom: 14px;
    }
    table.schedule-table th {
      border: 1px solid #000;
      background-color: #f1f5f9;
      padding: 6px 4px;
      font-size: 11px;
    }
    table.schedule-table td {
      border: 1px solid #ccc;
    }
    .legend-container {
      display: flex;
      gap: 16px;
      margin-top: 10px;
    }
    .legend-box {
      flex: 1;
      border: 1px solid #000;
    }
    .legend-title {
      background-color: #f1f5f9;
      font-size: 11px;
      font-weight: bold;
      padding: 4px 8px;
      border-bottom: 1px solid #000;
      text-transform: uppercase;
    }
    table.legend-table {
      width: 100%;
      border-collapse: collapse;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      padding: 0 40px;
      page-break-inside: avoid;
    }
    .sig-box {
      text-align: center;
      font-size: 11px;
    }
    .sig-space {
      height: 48px;
    }
    .print-actions {
      margin-bottom: 12px;
      display: flex;
      gap: 8px;
    }
    .btn-print {
      background-color: #059669;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      font-size: 12px;
    }
    @media print {
      .print-actions {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="btn-print" onclick="window.print()">🖨 Cetak Sekarang / Simpan sebagai PDF</button>
  </div>

  <div class="header-box">
    <div class="header-sub">SDIT AL FIKRI • KEC. SANGKULIRANG</div>
    <h1 class="header-title">${schedule.examHeaderTitle || 'JADWAL ASESMEN SUMATIF'}</h1>
    <div class="header-meta">
      <strong>Tahun Ajaran:</strong> ${schedule.schoolYear || '2025/2026'} &nbsp;•&nbsp; 
      <strong>Periode:</strong> ${schedule.period || '22 – 26 September 2025'} &nbsp;•&nbsp; 
      <strong>Durasi:</strong> ${schedule.duration || '90 Menit / Sesi'}
    </div>
  </div>

  <table class="schedule-table">
    <thead>
      <tr>
        <th rowspan="2" style="width: 25px; border-right: 1px solid #000;">No</th>
        <th rowspan="2" style="width: 85px; border-right: 1px solid #000;">Hari / Tgl</th>
        <th rowspan="2" style="width: 105px; border-right: 1px solid #000;">Waktu / Sesi</th>
        <th rowspan="2" style="border-right: 2px solid #000;">Mata Pelajaran & Sasaran</th>
        <th colspan="${rooms.length}" style="border-right: 2px solid #000; text-align: center;">KODE PENGAWAS RUANG KELAS</th>
      </tr>
      <tr>
        ${roomHeadersHtml}
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>

  <div class="legend-container">
    <div class="legend-box">
      <div class="legend-title">Daftar Kode Pengawas (Bagian 1)</div>
      <table class="legend-table">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 1px solid #ccc; font-size: 10px;">
            <th style="padding: 3px; width: 40px; border-right: 1px solid #ccc;">Kode</th>
            <th style="padding: 3px; text-align: left; border-right: 1px solid #ccc;">Nama Guru / Pengawas</th>
            <th style="padding: 3px; width: 50px;">Sesi</th>
          </tr>
        </thead>
        <tbody>
          ${renderProctorCol(leftProctors)}
        </tbody>
      </table>
    </div>

    <div class="legend-box">
      <div class="legend-title">Daftar Kode Pengawas (Bagian 2)</div>
      <table class="legend-table">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 1px solid #ccc; font-size: 10px;">
            <th style="padding: 3px; width: 40px; border-right: 1px solid #ccc;">Kode</th>
            <th style="padding: 3px; text-align: left; border-right: 1px solid #ccc;">Nama Guru / Pengawas</th>
            <th style="padding: 3px; width: 50px;">Sesi</th>
          </tr>
        </thead>
        <tbody>
          ${renderProctorCol(rightProctors)}
        </tbody>
      </table>
    </div>
  </div>

  <div class="signatures">
    <div class="sig-box">
      Mengetahui,<br/>
      <strong>Kepala SDIT AL FIKRI</strong>
      <div class="sig-space"></div>
      <strong><u>H. Ahmad Fikri, S.Pd.I</u></strong><br/>
      <span>NIP. -</span>
    </div>
    <div class="sig-box">
      Sangkulirang, 22 September 2025<br/>
      <strong>Ketua Panitia Asesmen</strong>
      <div class="sig-space"></div>
      <strong><u>Panitia Ujian SDIT AL FIKRI</u></strong><br/>
      <span>NIP. -</span>
    </div>
  </div>
</body>
</html>
  `;

  // Buka di jendela baru atau unduh sebagai file html jika popup diblokir
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  } else {
    // Fallback: unduh langsung sebagai file HTML cetak
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JADWAL_UJIAN_${(schedule.examHeaderTitle || 'SDIT_AL_FIKRI').replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
