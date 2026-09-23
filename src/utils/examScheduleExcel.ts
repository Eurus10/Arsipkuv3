import * as XLSX from 'xlsx';
import {
  ActiveExamSchedule,
  ExamProctorCodeItem,
  ExamScheduleRow,
  DEFAULT_EXAM_ROOMS,
  DEFAULT_PROCTOR_CODES,
} from '../types';

/**
 * Excel <-> aplikasi converter untuk Jadwal Asesmen.
 *
 * FORMAT CANONICAL:
 * - Export dan Import memakai template visual yang sama.
 * - Satu sheet utama berisi matriks jadwal + daftar kode/nama pengawas di sisi kanan.
 * - Kolom jadwal: NO | HARI/TANGGAL | WAKTU | MATA PELAJARAN | [RUANG...]
 * - Kegiatan khusus (APEL, SHALAT DUHA, ISTIRAHAT, dll.) tetap berupa teks.
 * - Import tetap kompatibel dengan format export lama sebanyak mungkin.
 */

function cleanText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeCode(value: unknown): string {
  return cleanText(value).toUpperCase();
}

function isEmptyCell(value: unknown): boolean {
  return value === null || value === undefined || cleanText(value) === '';
}

export function formatToDDMMYYYY(val: any): string {
  if (val === null || val === undefined || val === '') return '';

  if (typeof val === 'number' && val > 20000 && val < 70000) {
    try {
      const dateObj = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!Number.isNaN(dateObj.getTime())) {
        return `${String(dateObj.getDate()).padStart(2, '0')}/${String(
          dateObj.getMonth() + 1
        ).padStart(2, '0')}/${dateObj.getFullYear()}`;
      }
    } catch {
      // Continue with string parsing.
    }
  }

  const str = cleanText(val);
  if (!str) return '';

  const slashMatch = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[1].padStart(2, '0')}/${slashMatch[2].padStart(2, '0')}/${slashMatch[3]}`;
  }

  const isoMatch = str.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[3].padStart(2, '0')}/${isoMatch[2].padStart(2, '0')}/${isoMatch[1]}`;
  }

  const idMonthMap: Record<string, string> = {
    jan: '01', januari: '01',
    feb: '02', februari: '02',
    mar: '03', maret: '03',
    apr: '04', april: '04',
    mei: '05', may: '05',
    jun: '06', juni: '06',
    jul: '07', juli: '07',
    agu: '08', agust: '08', agustus: '08', aug: '08',
    sep: '09', sept: '09', september: '09',
    okt: '10', oktober: '10', oct: '10',
    nov: '11', november: '11',
    des: '12', desember: '12', dec: '12',
  };

  const textDateMatch = str.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (textDateMatch) {
    const month = idMonthMap[textDateMatch[2].toLowerCase()] ||
      idMonthMap[textDateMatch[2].substring(0, 3).toLowerCase()];
    if (month) {
      return `${textDateMatch[1].padStart(2, '0')}/${month}/${textDateMatch[3]}`;
    }
  }

  return str;
}

export function splitSessionTimeAndLabel(sessionStr: string): { time: string; session: string } {
  if (!sessionStr) return { time: '07.30 – 09.00', session: 'Sesi 1' };

  const str = cleanText(sessionStr);
  const bracketMatch = str.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
  if (bracketMatch) {
    return { time: cleanText(bracketMatch[1]), session: cleanText(bracketMatch[2]) };
  }

  const sesiMatch = str.match(/\bSesi\s*[-_]?\s*\d+\b.*$/i);
  if (sesiMatch) {
    const label = cleanText(sesiMatch[0]);
    const time = cleanText(str.slice(0, sesiMatch.index));
    return {
      time: time.replace(/[()\-–|]+\s*$/, '').trim(),
      session: label,
    };
  }

  return { time: str, session: '' };
}

function getSessionParts(session: string): { time: string; label: string } {
  const parsed = splitSessionTimeAndLabel(session);
  return { time: cleanText(parsed.time), label: cleanText(parsed.session) };
}

function getRoomCode(row: ExamScheduleRow, room: string): string {
  const direct = normalizeCode(row.roomCodes?.[room]);
  if (direct && direct !== '—' && direct !== '-') return direct;

  const legacy = (row.proctorDetails || []).find(
    (p) => cleanText(p.roomOrClass).toUpperCase() === room.toUpperCase()
  );
  return normalizeCode(legacy?.proctorCode);
}

function uniqueRooms(schedule: ActiveExamSchedule): string[] {
  return Array.from(
    new Set(
      (schedule.rooms && schedule.rooms.length > 0 ? schedule.rooms : DEFAULT_EXAM_ROOMS)
        .map((r) => cleanText(r).toUpperCase())
        .filter(Boolean)
    )
  );
}

/**
 * Export dengan format visual seperti contoh:
 * NO | HARI/TANGGAL | WAKTU | MATA PELAJARAN | 1A | 1B | ... | KODE PENGAWAS | NAMA PENGAWAS
 */
export function exportScheduleToExcel(schedule: ActiveExamSchedule): void {
  const rooms = uniqueRooms(schedule);
  const proctorCodes =
    schedule.proctorCodes && schedule.proctorCodes.length > 0
      ? schedule.proctorCodes
      : DEFAULT_PROCTOR_CODES;

  const roomStartCol = 4;
  const proctorStartCol = roomStartCol + rooms.length;
  const codeCol = proctorStartCol + 1;
  const nameCol = proctorStartCol + 2;
  const totalCols = nameCol + 1;

  const rows: any[][] = [];
  rows.push([schedule.examHeaderTitle || 'JADWAL PENGAWAS ASESMEN']);
  rows.push([`TAHUN PELAJARAN ${schedule.schoolYear || '2025/2026'}`]);
  if (schedule.period) rows.push([`PERIODE: ${schedule.period}`]);
  rows.push([]);
  rows.push([]);

  const headerRow = rows.length;
  const header = Array(totalCols).fill('');
  header[0] = 'NO';
  header[1] = 'HARI/TANGGAL';
  header[2] = 'WAKTU';
  header[3] = 'MATA PELAJARAN';
  rooms.forEach((room, i) => { header[roomStartCol + i] = room; });
  header[proctorStartCol] = 'KODE PENGAWAS';
  header[nameCol] = 'NAMA PENGAWAS';
  rows.push(header);

  // Keep the example's compact visual pattern: one day/date block, then the time rows.
  const scheduleStartRow = rows.length;
  let previousDay = '';
  let previousDate = '';

  (schedule.rows || []).forEach((row, idx) => {
    const { time } = getSessionParts(row.session);
    const day = cleanText(row.day);
    const date = row.date ? formatToDDMMYYYY(row.date) : '';
    const dayDate = [day, date].filter(Boolean).join('\n');

    const out = Array(totalCols).fill('');
    // Repeat values in the data model but visually merge day/date later when possible.
    out[0] = idx + 1;
    out[1] = dayDate;
    out[2] = time;
    out[3] = cleanText(row.subject);
    rooms.forEach((room, i) => {
      out[roomStartCol + i] = getRoomCode(row, room);
    });

    rows.push(out);
    previousDay = day;
    previousDate = date;
  });

  // Place the proctor directory beside the schedule, aligned from the first schedule row.
  const proctorStartRow = scheduleStartRow;
  proctorCodes.forEach((p, i) => {
    const target = proctorStartRow + i;
    while (rows.length <= target) rows.push(Array(totalCols).fill(''));
    rows[target][proctorStartCol] = `${normalizeCode(p.code)}.`;
    rows[target][nameCol] = cleanText(p.name);
  });

  // Signature/footer area, kept below the longest side of the sheet.
  const footerStart = Math.max(rows.length, scheduleStartRow + (schedule.rows || []).length) + 2;
  while (rows.length < footerStart) rows.push(Array(totalCols).fill(''));
  rows.push(Array(totalCols).fill(''));
  rows.push(['Keterangan Kode Pengawas:']);
  rows.push(['Kode di dalam matriks menunjukkan pengawas ruang sesuai daftar KODE PENGAWAS.']);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Merge title and metadata across the full printable width.
  const merges: XLSX.Range[] = [];
  for (let r = 0; r < 5; r++) {
    if (rows[r] && rows[r].length > 1) {
      merges.push({ s: { r, c: 0 }, e: { r, c: totalCols - 1 } });
    }
  }

  // Merge NO and HARI/TANGGAL vertically per day, matching the supplied example.
  const dataRows = schedule.rows || [];
  let groupStart = 0;
  while (groupStart < dataRows.length) {
    const first = dataRows[groupStart];
    const day = cleanText(first.day);
    const date = first.date ? formatToDDMMYYYY(first.date) : '';
    let groupEnd = groupStart + 1;
    while (groupEnd < dataRows.length) {
      const candidate = dataRows[groupEnd];
      const cDay = cleanText(candidate.day);
      const cDate = candidate.date ? formatToDDMMYYYY(candidate.date) : '';
      if (cDay !== day || cDate !== date) break;
      groupEnd++;
    }

    if (groupEnd - groupStart > 1) {
      // No is merged across the day's rows; first row contains the day number.
      merges.push({
        s: { r: scheduleStartRow + groupStart, c: 0 },
        e: { r: scheduleStartRow + groupEnd - 1, c: 0 },
      });
      merges.push({
        s: { r: scheduleStartRow + groupStart, c: 1 },
        e: { r: scheduleStartRow + groupEnd - 1, c: 1 },
      });
    }
    groupStart = groupEnd;
  }

  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 5 },
    { wch: 17 },
    { wch: 15 },
    { wch: 27 },
    ...rooms.map(() => ({ wch: 6 })),
    { wch: 16 },
    { wch: 31 },
  ];

  // Print-friendly styling. xlsx supports basic cell styles in generated files.
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = ws[cellRef];
      if (!cell) continue;
      cell.s = {
        alignment: {
          vertical: 'center',
          horizontal: c >= roomStartCol && c < proctorStartCol ? 'center' : 'left',
          wrapText: true,
        },
        border: {
          top: { style: 'thin', color: { rgb: '808080' } },
          bottom: { style: 'thin', color: { rgb: '808080' } },
          left: { style: 'thin', color: { rgb: '808080' } },
          right: { style: 'thin', color: { rgb: '808080' } },
        },
      };
    }
  }

  // Header emphasis.
  for (let c = 0; c < totalCols; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: headerRow, c })];
    if (cell) {
      cell.s = {
        ...cell.s,
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      };
    }
  }

  // Special activity rows remain textual, but get a distinct visual treatment.
  const specialPattern = /^(APEL|ISTIRAHAT|SHALAT\s+DUHA|SHOLAT\s+DUHA)$/i;
  dataRows.forEach((row, i) => {
    if (!specialPattern.test(cleanText(row.subject))) return;
    const rr = scheduleStartRow + i;
    for (let c = 0; c < totalCols; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: rr, c })];
      if (!cell) continue;
      cell.s = {
        ...cell.s,
        font: { bold: true },
      };
    }
  });

  // Row heights for compact but readable output.
  ws['!rows'] = [];
  ws['!rows'][0] = { hpt: 24 };
  ws['!rows'][headerRow] = { hpt: 28 };
  dataRows.forEach((row, i) => {
    ws['!rows'][scheduleStartRow + i] = { hpt: 28 };
  });

  ws['!printArea'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: Math.max(rows.length - 1, 0), c: totalCols - 1 },
  });

  XLSX.utils.book_append_sheet(wb, ws, 'JADWAL_PENGAWAS');

  const cleanTitle = (schedule.examHeaderTitle || 'Jadwal_Pengawas')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50);
  XLSX.writeFile(wb, `${cleanTitle}_SDIT_AL_FIKRI.xlsx`);
}

function normalizeHeader(value: unknown): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/[\n\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMetadataRows(data: any[][], currentSchedule: ActiveExamSchedule) {
  let examHeaderTitle = currentSchedule.examHeaderTitle || 'JADWAL ASESMEN SUMATIF';
  let schoolYear = currentSchedule.schoolYear || 'TAHUN AJARAN 2025/2026';
  let period = currentSchedule.period || '';
  let duration = currentSchedule.duration || '90 Menit / Sesi Ujian';

  for (let r = 0; r < Math.min(data.length, 8); r++) {
    const joined = (data[r] || []).map(cleanText).filter(Boolean).join(' ').trim();
    if (!joined) continue;

    if (r === 0 && !/^(tahun ajaran|tahun pelajaran|periode|durasi)\s*:/i.test(joined)) {
      examHeaderTitle = joined;
    }

    const yearMatch = joined.match(/tahun\s*(?:ajaran|pelajaran)\s*:?\s*(.+)$/i);
    if (yearMatch) schoolYear = yearMatch[1].trim();

    const periodMatch = joined.match(/^periode\s*:\s*(.+)$/i);
    if (periodMatch) period = periodMatch[1].trim();

    const durationMatch = joined.match(/^durasi\s*:\s*(.+)$/i);
    if (durationMatch) duration = durationMatch[1].trim();
  }

  return { examHeaderTitle, schoolYear, period, duration };
}

function detectScheduleHeader(data: any[][]): number {
  for (let r = 0; r < Math.min(data.length, 30); r++) {
    const headers = (data[r] || []).map(normalizeHeader);
    const hasSubject = headers.some((h) => /^(mata pelajaran|mapel|subject|pelajaran)$/.test(h));
    const hasDay = headers.some((h) => /^(hari|hari\/tanggal|day)$/.test(h));
    const hasTime = headers.some((h) => /^(waktu|pukul|jam|time)$/.test(h));
    if (hasSubject && (hasDay || hasTime)) return r;
  }
  return -1;
}

function getColumnIndexes(header: any[]) {
  const idx = {
    no: -1,
    day: -1,
    date: -1,
    dayDate: -1,
    time: -1,
    session: -1,
    combinedSession: -1,
    subject: -1,
    classes: -1,
    notes: -1,
    rooms: {} as Record<string, number>,
    proctorCode: -1,
    proctorName: -1,
  };

  header.forEach((raw, c) => {
    const h = normalizeHeader(raw);
    if (idx.no < 0 && /^no\.?$/.test(h)) idx.no = c;
    else if (idx.day < 0 && /^hari$/.test(h)) idx.day = c;
    else if (idx.dayDate < 0 && /^(hari\/tanggal|hari & tanggal|hari tanggal)$/.test(h)) idx.dayDate = c;
    else if (idx.date < 0 && /^(tanggal|tgl|date|tanggal \(dd\/mm\/yyyy\))$/.test(h)) idx.date = c;
    else if (idx.time < 0 && /^(waktu|pukul|jam|time)$/.test(h)) idx.time = c;
    else if (idx.session < 0 && /^sesi$/.test(h)) idx.session = c;
    else if (idx.combinedSession < 0 && /^(waktu \/ sesi|sesi \/ waktu)$/.test(h)) idx.combinedSession = c;
    else if (idx.subject < 0 && /^(mata pelajaran|mapel|subject|pelajaran|kegiatan)$/.test(h)) idx.subject = c;
    else if (idx.classes < 0 && /^(sasaran kelas|kelas|tingkat|jenjang)$/.test(h)) idx.classes = c;
    else if (idx.notes < 0 && /^(catatan|ket|keterangan|notes)$/.test(h)) idx.notes = c;
    else if (idx.proctorCode < 0 && /^(kode pengawas|kode)$/.test(h)) idx.proctorCode = c;
    else if (idx.proctorName < 0 && /^(nama pengawas|nama guru|nama lengkap|nama lengkap guru \/ pengawas)$/.test(h)) idx.proctorName = c;

    // Accept 1A, 1 A, 1-A, 1_A, etc. as room headers.
    const roomMatch = cleanText(raw).toUpperCase().match(/^([1-6])\s*[-_]?\s*([A-Z])$/);
    if (roomMatch) idx.rooms[`${roomMatch[1]}${roomMatch[2]}`] = c;
  });

  return idx;
}

function inferRoomsFromHeader(indexes: ReturnType<typeof getColumnIndexes>, currentSchedule: ActiveExamSchedule): string[] {
  const detected = Object.keys(indexes.rooms);
  if (detected.length > 0) {
    return detected.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }
  return (currentSchedule.rooms && currentSchedule.rooms.length > 0
    ? currentSchedule.rooms
    : DEFAULT_EXAM_ROOMS
  ).map((r) => cleanText(r).toUpperCase()).filter(Boolean);
}

function parseSessionValue(timeValue: unknown, sessionValue: unknown, combinedValue: unknown): string {
  const time = cleanText(timeValue);
  const label = cleanText(sessionValue);
  if (time || label) {
    if (time && label) return `${time} (${label})`;
    return time || label;
  }
  const combined = cleanText(combinedValue);
  if (combined) return combined;
  return '07.30 – 09.00 (Sesi 1)';
}

function parseDayDateCell(value: unknown): { day: string; date: string } {
  const text = cleanText(value);
  if (!text) return { day: '', date: '' };
  const normalized = text.replace(/\r/g, '\n');
  const parts = normalized.split(/\n|,/).map((v) => cleanText(v)).filter(Boolean);
  let date = '';
  let day = '';
  for (const part of parts) {
    const parsed = formatToDDMMYYYY(part);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(parsed)) date = parsed;
    else if (!day) day = part;
  }
  if (!day && !date) {
    const dateMatch = text.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/);
    if (dateMatch) {
      date = formatToDDMMYYYY(dateMatch[1]);
      day = cleanText(text.replace(dateMatch[1], '').replace(/[\n,]+/g, ' '));
    } else day = text;
  }
  return { day, date };
}

function extractProctorsFromSheetData(data: any[][]): ExamProctorCodeItem[] {
  if (!data?.length) return [];

  // 1) Canonical side directory in the same sheet.
  for (let r = 0; r < Math.min(data.length, 30); r++) {
    const header = data[r] || [];
    const indexes = getColumnIndexes(header);
    if (indexes.proctorCode >= 0 && indexes.proctorName >= 0) {
      const result: ExamProctorCodeItem[] = [];
      const seen = new Set<string>();
      for (let rr = r + 1; rr < data.length; rr++) {
        const row = data[rr] || [];
        const code = normalizeCode(row[indexes.proctorCode]).replace(/[.]$/, '');
        const name = cleanText(row[indexes.proctorName]);
        if (!code || !name || seen.has(code)) continue;
        if (code.length > 5 || /^(kode|no|daftar|total|jumlah)$/i.test(code)) continue;
        seen.add(code);
        result.push({ code, name });
      }
      if (result.length) return result;
    }
  }

  // 2) Legacy dedicated-sheet/generic table support.
  for (let r = 0; r < Math.min(data.length, 30); r++) {
    const row = data[r] || [];
    let codeCol = -1;
    let nameCol = -1;
    let roleCol = -1;
    row.forEach((cell, c) => {
      const val = normalizeHeader(cell);
      if (codeCol === -1 && /^(kode|code|singkatan|inisial|initial|kd|kode guru|kode pengawas)$/.test(val)) codeCol = c;
      if (nameCol === -1 && /^(nama|nama guru|nama lengkap|nama pengawas|guru|pengawas|name)$/.test(val)) nameCol = c;
      if (roleCol === -1 && /^(mapel|mata pelajaran|tugas|role|jabatan|wali kelas|keterangan)$/.test(val)) roleCol = c;
    });
    if (codeCol < 0 || nameCol < 0) continue;

    const result: ExamProctorCodeItem[] = [];
    const seen = new Set<string>();
    for (let rr = r + 1; rr < data.length; rr++) {
      const dRow = data[rr] || [];
      const code = normalizeCode(dRow[codeCol]).replace(/[.]$/, '');
      const name = cleanText(dRow[nameCol]);
      if (!code || !name || seen.has(code)) continue;
      if (code.length > 5 || /^(kode|nama|no|total|jumlah)$/i.test(code)) continue;
      seen.add(code);
      result.push({ code, name, subjectOrRole: roleCol >= 0 ? cleanText(dRow[roleCol]) || undefined : undefined });
    }
    if (result.length) return result;
  }
  return [];
}

export function extractProctorsFromWorkbook(wb: XLSX.WorkBook): ExamProctorCodeItem[] {
  // Prefer the same sheet used by the new canonical export.
  const preferred = wb.SheetNames.find((n) => /^JADWAL_PENGAWAS$/i.test(n));
  const exactNames = wb.SheetNames.filter((name) => /^KODE_PENGAWAS$/i.test(name));
  const others = wb.SheetNames.filter((name) => name !== preferred && !exactNames.includes(name));
  const ordered = [preferred, ...exactNames, ...others].filter(Boolean) as string[];

  for (const name of ordered) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
    const result = extractProctorsFromSheetData(data);
    if (result.length) return result;
  }
  return [];
}

export async function parseExamScheduleExcel(
  file: File,
  currentSchedule: ActiveExamSchedule
): Promise<{
  schedule: ActiveExamSchedule;
  rowCount: number;
  proctorCount: number;
  warnings: string[];
}> {
  const warnings: string[] = [];
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  if (!wb.SheetNames?.length) throw new Error('File Excel tidak memiliki sheet yang valid.');

  const scheduleSheetName =
    wb.SheetNames.find((name) => /^JADWAL_PENGAWAS$/i.test(name)) ||
    wb.SheetNames.find((name) => /^JADWAL_UJIAN$/i.test(name)) ||
    wb.SheetNames.find((name) => /jadwal|schedule|sesi|asesmen|ujian|sumatif|main|sheet1/i.test(name)) ||
    wb.SheetNames[0];

  const ws = wb.Sheets[scheduleSheetName];
  if (!ws) throw new Error(`Sheet ${scheduleSheetName} tidak ditemukan.`);
  const sData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
  if (!sData.length) throw new Error(`Sheet ${scheduleSheetName} kosong.`);

  const metadata = parseMetadataRows(sData, currentSchedule);
  const tableHeaderIdx = detectScheduleHeader(sData);
  if (tableHeaderIdx < 0) {
    throw new Error('Format tabel jadwal tidak dikenali. Gunakan template export aplikasi dengan kolom Hari/Tanggal, Waktu, Mata Pelajaran, dan ruang kelas.');
  }

  const indexes = getColumnIndexes(sData[tableHeaderIdx] || []);
  if (indexes.subject < 0) throw new Error('Kolom "Mata Pelajaran" tidak ditemukan pada tabel jadwal.');

  const rooms = inferRoomsFromHeader(indexes, currentSchedule);
  const parsedProctorCodes = extractProctorsFromWorkbook(wb);
  const proctors = parsedProctorCodes.length > 0
    ? parsedProctorCodes
    : (currentSchedule.proctorCodes && currentSchedule.proctorCodes.length > 0
        ? JSON.parse(JSON.stringify(currentSchedule.proctorCodes))
        : JSON.parse(JSON.stringify(DEFAULT_PROCTOR_CODES)));

  if (!parsedProctorCodes.length) {
    warnings.push('Daftar kode pengawas tidak ditemukan pada file. Data kode guru yang tersimpan sebelumnya digunakan sebagai fallback.');
  }

  const proctorMap: Record<string, string> = {};
  proctors.forEach((p) => {
    const code = normalizeCode(p.code);
    if (code) proctorMap[code] = cleanText(p.name);
  });

  const parsedRows: ExamScheduleRow[] = [];
  let currentDay = '';
  let currentDate = '';

  for (let r = tableHeaderIdx + 1; r < sData.length; r++) {
    const row = sData[r] || [];
    const subject = indexes.subject >= 0 ? cleanText(row[indexes.subject]) : '';
    let dayValue = indexes.day >= 0 ? cleanText(row[indexes.day]) : '';
    let dateValue = indexes.date >= 0 ? formatToDDMMYYYY(row[indexes.date]) : '';

    if (indexes.dayDate >= 0) {
      const parsed = parseDayDateCell(row[indexes.dayDate]);
      dayValue = parsed.day || dayValue;
      dateValue = parsed.date || dateValue;
    }

    const timeValue = indexes.time >= 0 ? cleanText(row[indexes.time]) : '';
    const sessionValue = indexes.session >= 0 ? cleanText(row[indexes.session]) : '';
    const combinedValue = indexes.combinedSession >= 0 ? cleanText(row[indexes.combinedSession]) : '';

    if (dayValue) currentDay = dayValue;
    if (dateValue) currentDate = dateValue;

    const hasRoomValue = rooms.some((room) => {
      const col = indexes.rooms[room];
      return col !== undefined && !isEmptyCell(row[col]);
    });

    const hasAnyScheduleData = [subject, dayValue, dateValue, timeValue, sessionValue, combinedValue].some(Boolean) || hasRoomValue;
    if (!hasAnyScheduleData) continue;

    // Stop before obvious footer/legend areas that contain no schedule fields.
    if (!subject && !hasRoomValue && !timeValue) continue;

    const roomCodes: Record<string, string> = {};
    const proctorDetails: any[] = [];
    rooms.forEach((room) => {
      const col = indexes.rooms[room];
      const rawCode = col === undefined ? '' : normalizeCode(row[col]);
      const code = /^(—|-|–|\.|KOSONG|NULL|UNDEFINED|0)$/i.test(rawCode) ? '' : rawCode;
      roomCodes[room] = code;
      if (code) {
        proctorDetails.push({
          roomOrClass: room,
          proctorCode: code,
          proctorName: proctorMap[code] || `Guru [${code}]`,
        });
      }
    });

    parsedRows.push({
      id: `row-${r + 1}-${Date.now().toString(36)}`,
      day: currentDay,
      date: currentDate || undefined,
      session: parseSessionValue(timeValue, sessionValue, combinedValue),
      subject,
      classes: indexes.classes >= 0 ? cleanText(row[indexes.classes]) || 'Kelas 1–6' : 'Kelas 1–6',
      notes: indexes.notes >= 0 ? cleanText(row[indexes.notes]) : '',
      roomCodes,
      proctorDetails,
    });
  }

  if (!parsedRows.length) throw new Error('Tidak ada baris jadwal yang berhasil terbaca dari file Excel.');

  const updatedSchedule: ActiveExamSchedule = {
    id: currentSchedule.id || `schedule-${Date.now()}`,
    examHeaderTitle: metadata.examHeaderTitle,
    schoolYear: metadata.schoolYear,
    period: metadata.period || currentSchedule.period || '',
    duration: metadata.duration || currentSchedule.duration || '90 Menit / Sesi Ujian',
    notes: currentSchedule.notes || '',
    rooms,
    proctorCodes: proctors,
    rows: parsedRows,
  };

  return {
    schedule: updatedSchedule,
    rowCount: parsedRows.length,
    proctorCount: proctors.length,
    warnings,
  };
}
