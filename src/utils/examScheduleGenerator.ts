import {
  ActiveExamSchedule,
  ExamProctorCodeItem,
  ExamScheduleRow,
  ExamProctorAssignment,
  DEFAULT_EXAM_ROOMS,
} from '../types';

/**
 * Interface opsi generator jadwal pengawas ujian otomatis
 */
export interface AutoGenerateOptions {
  // Pemetaan kode wali kelas untuk masing-masing ruang (misal: '1A' -> 'A', '1B' -> 'B', dst)
  homeroomMap: Record<string, string>;
  // Apakah hari pertama wajib diawasi oleh wali kelas masing-masing
  enforceHomeroomDay1?: boolean;
  // Hindari guru mengawas di ruangan yang sama pada hari ujian berikutnya
  avoidSameRoomConsecutive?: boolean;
  // Rotasi jenjang seimbang (kelas 1-3 vs 4-6)
  balanceGradeRotation?: boolean;
}

/**
 * Hasil validasi terperinci dari jadwal hasil generate
 */
export interface ScheduleValidationResult {
  isValid: boolean;
  totalSlots: number;
  assignedSlots: number;
  unassignedSlots: number;
  conflictsCount: number; // guru ganda dalam 1 sesi
  homeroomTargetCount: number;
  homeroomMatchedCount: number;
  homeroomCompliancePercent: number; // 0 - 100%
  consecutiveSameRoomViolations: number;
  gradeImbalanceScore: number;
  minTeacherLoad: number;
  maxTeacherLoad: number;
  maxLoadDelta: number; // selisih beban tertinggi vs terendah
  teacherLoads: Record<
    string,
    {
      code: string;
      name: string;
      totalSessions: number;
      lowGradeSessions: number;
      highGradeSessions: number;
      consecutiveViolations: number;
    }
  >;
  warnings: string[];
  summaryMessage: string;
}

export interface GenerateSmartScheduleResult {
  updatedRows: ExamScheduleRow[];
  validation: ScheduleValidationResult;
  stats: {
    teacherSessionCounts: Record<string, number>;
    warnings: string[];
  };
}

interface DayGroup {
  dayKey: string;
  dayName: string;
  date: string;
  dayIndex: number;
  rowIndices: number[];
}

function normalizeCode(code: unknown): string {
  return String(code ?? '').trim().toUpperCase();
}

function getGradeGroup(room: string): 'low' | 'high' | 'other' {
  const clean = String(room ?? '').trim();
  const firstChar = clean.charAt(0);
  if (['1', '2', '3'].includes(firstChar)) return 'low';
  if (['4', '5', '6'].includes(firstChar)) return 'high';
  return 'other';
}

function getDayKey(day: string, date?: string): string {
  const d = String(day ?? '').trim().toLowerCase();
  const dt = String(date ?? '').trim().toLowerCase();
  return dt ? `${d}|${dt}` : d;
}

/**
 * Kelompokkan baris jadwal ke dalam hari-hari secara kronologis berurutan
 */
function groupRowsIntoDays(rows: ExamScheduleRow[]): DayGroup[] {
  const days: DayGroup[] = [];
  const keyToDayIndex: Record<string, number> = {};

  rows.forEach((row, rowIndex) => {
    const key = getDayKey(row.day, row.date);
    if (keyToDayIndex[key] === undefined) {
      const dayIndex = days.length;
      keyToDayIndex[key] = dayIndex;
      days.push({
        dayKey: key,
        dayName: String(row.day ?? '').trim(),
        date: String(row.date ?? '').trim(),
        dayIndex,
        rowIndices: [rowIndex],
      });
    } else {
      const dayIndex = keyToDayIndex[key];
      days[dayIndex].rowIndices.push(rowIndex);
    }
  });

  return days;
}

/**
 * Sinkronisasi data rows agar roomCodes dan proctorDetails selalu konsisten
 */
function syncRowsWithProctors(
  rows: ExamScheduleRow[],
  rooms: string[],
  proctorMap: Record<string, string>
): ExamScheduleRow[] {
  return rows.map((row) => {
    const currentCodes = { ...(row.roomCodes || {}) };
    const normalizedCodes: Record<string, string> = {};

    rooms.forEach((rm) => {
      const code = normalizeCode(currentCodes[rm]);
      normalizedCodes[rm] = code && code !== '—' && code !== '-' ? code : '';
    });

    const proctorDetails: ExamProctorAssignment[] = rooms
      .map((rm) => {
        const code = normalizedCodes[rm];
        if (!code) return null;
        return {
          roomOrClass: rm,
          proctorCode: code,
          proctorName: proctorMap[code] || `Guru [${code}]`,
        };
      })
      .filter(Boolean) as ExamProctorAssignment[];

    return {
      ...row,
      roomCodes: normalizedCodes,
      proctorDetails,
    };
  });
}

/**
 * Validator lengkap untuk memeriksa seluruh constraint pada jadwal ujian
 */
export function validateScheduleAssignments(
  rows: ExamScheduleRow[],
  rooms: string[],
  proctors: ExamProctorCodeItem[],
  options: AutoGenerateOptions,
  days: DayGroup[]
): ScheduleValidationResult {
  const proctorCodesList = proctors.map((p) => normalizeCode(p.code)).filter(Boolean);
  const validProctorSet = new Set(proctorCodesList);
  const teacherMap: Record<string, string> = {};
  proctors.forEach((p) => {
    const code = normalizeCode(p.code);
    if (code) teacherMap[code] = p.name;
  });

  let totalSlots = 0;
  let assignedSlots = 0;
  let unassignedSlots = 0;
  let conflictsCount = 0;

  const teacherLoadMap: Record<
    string,
    {
      code: string;
      name: string;
      totalSessions: number;
      lowGradeSessions: number;
      highGradeSessions: number;
      consecutiveViolations: number;
      assignedRoomsByDay: Record<number, Set<string>>;
    }
  > = {};

  proctorCodesList.forEach((code) => {
    teacherLoadMap[code] = {
      code,
      name: teacherMap[code] || `Guru [${code}]`,
      totalSessions: 0,
      lowGradeSessions: 0,
      highGradeSessions: 0,
      consecutiveViolations: 0,
      assignedRoomsByDay: {},
    };
  });

  const warnings: string[] = [];

  // 1. Periksa per baris (sesi) untuk konflik & penugasan
  rows.forEach((row, rIdx) => {
    const usedInRow = new Map<string, string[]>(); // code -> rooms
    rooms.forEach((rm) => {
      totalSlots += 1;
      const code = normalizeCode(row.roomCodes?.[rm]);
      if (!code || code === '—' || code === '-') {
        unassignedSlots += 1;
        return;
      }

      assignedSlots += 1;

      if (!validProctorSet.has(code)) {
        warnings.push(`Baris #${rIdx + 1} (${row.day || ''}): Kode guru [${code}] tidak ada dalam master data guru.`);
      }

      if (!usedInRow.has(code)) {
        usedInRow.set(code, [rm]);
      } else {
        usedInRow.get(code)!.push(rm);
      }

      if (teacherLoadMap[code]) {
        teacherLoadMap[code].totalSessions += 1;
        const gradeCat = getGradeGroup(rm);
        if (gradeCat === 'low') teacherLoadMap[code].lowGradeSessions += 1;
        else if (gradeCat === 'high') teacherLoadMap[code].highGradeSessions += 1;
      }
    });

    // Deteksi guru ganda dalam 1 sesi
    usedInRow.forEach((assignedRooms, code) => {
      if (assignedRooms.length > 1) {
        conflictsCount += 1;
        warnings.push(
          `Bentrok pada ${row.day} (${row.session}): Guru [${code}] mengawas di ${assignedRooms.length} ruang sekaligus (${assignedRooms.join(', ')}).`
        );
      }
    });
  });

  // 2. Evaluasi aturan Wali Kelas Hari Pertama
  let homeroomTargetCount = 0;
  let homeroomMatchedCount = 0;
  const isEnforceHomeroom = Boolean(options.enforceHomeroomDay1);

  if (days.length > 0 && isEnforceHomeroom) {
    const firstDay = days[0];
    firstDay.rowIndices.forEach((rIdx) => {
      const row = rows[rIdx];
      rooms.forEach((rm) => {
        const expectedWali = normalizeCode(options.homeroomMap[rm]);
        if (expectedWali && validProctorSet.has(expectedWali)) {
          homeroomTargetCount += 1;
          const actualCode = normalizeCode(row.roomCodes?.[rm]);
          if (actualCode === expectedWali) {
            homeroomMatchedCount += 1;
          }
        }
      });
    });
  }

  const homeroomCompliancePercent =
    homeroomTargetCount > 0 ? Math.round((homeroomMatchedCount / homeroomTargetCount) * 100) : 100;

  if (isEnforceHomeroom && homeroomTargetCount > 0 && homeroomMatchedCount < homeroomTargetCount) {
    warnings.push(
      `Wali kelas hari pertama: ${homeroomMatchedCount} dari ${homeroomTargetCount} slot (${homeroomCompliancePercent}%) terpenuhi.`
    );
  }

  // 3. Evaluasi aturan Pengulangan Ruang pada Hari Berikutnya (Consecutive Days)
  let consecutiveSameRoomViolations = 0;
  days.forEach((dayGroup) => {
    dayGroup.rowIndices.forEach((rIdx) => {
      const row = rows[rIdx];
      rooms.forEach((rm) => {
        const code = normalizeCode(row.roomCodes?.[rm]);
        if (code && teacherLoadMap[code]) {
          if (!teacherLoadMap[code].assignedRoomsByDay[dayGroup.dayIndex]) {
            teacherLoadMap[code].assignedRoomsByDay[dayGroup.dayIndex] = new Set();
          }
          teacherLoadMap[code].assignedRoomsByDay[dayGroup.dayIndex].add(rm);
        }
      });
    });
  });

  if (days.length > 1) {
    for (let d = 0; d < days.length - 1; d++) {
      const nextDayIdx = d + 1;
      proctorCodesList.forEach((code) => {
        const t = teacherLoadMap[code];
        if (!t) return;
        const currentRooms = t.assignedRoomsByDay[d] || new Set();
        const nextRooms = t.assignedRoomsByDay[nextDayIdx] || new Set();
        currentRooms.forEach((rm) => {
          if (nextRooms.has(rm)) {
            consecutiveSameRoomViolations += 1;
            t.consecutiveViolations += 1;
          }
        });
      });
    }
  }

  // 4. Evaluasi Pemerataan Beban & Rotasi Jenjang
  const loads = Object.values(teacherLoadMap).map((t) => t.totalSessions);
  const minTeacherLoad = loads.length > 0 ? Math.min(...loads) : 0;
  const maxTeacherLoad = loads.length > 0 ? Math.max(...loads) : 0;
  const maxLoadDelta = maxTeacherLoad - minTeacherLoad;

  let gradeImbalanceScore = 0;
  Object.values(teacherLoadMap).forEach((t) => {
    if (t.totalSessions >= 2) {
      gradeImbalanceScore += Math.abs(t.lowGradeSessions - t.highGradeSessions);
    }
  });

  const isValid = conflictsCount === 0;

  // Bangun ringkasan informatif
  const summaryParts: string[] = [];
  summaryParts.push(
    `Berhasil generate ${rows.length} sesi (${assignedSlots}/${totalSlots} slot terisi).`
  );

  if (isEnforceHomeroom && homeroomTargetCount > 0) {
    summaryParts.push(
      homeroomCompliancePercent === 100
        ? 'Wali kelas hari pertama terpenuhi 100%.'
        : `Wali kelas hari pertama: ${homeroomMatchedCount}/${homeroomTargetCount} slot.`
    );
  }

  summaryParts.push(
    maxLoadDelta <= 1
      ? `Beban merata (rata-rata ${minTeacherLoad}–${maxTeacherLoad} sesi per guru).`
      : `Distribusi beban guru: rentang ${minTeacherLoad} s.d. ${maxTeacherLoad} sesi (selisih ${maxLoadDelta}).`
  );

  if (options.avoidSameRoomConsecutive) {
    summaryParts.push(
      consecutiveSameRoomViolations === 0
        ? 'Tanpa pengulangan ruang berturut-turut.'
        : `Pengulangan ruang antar-hari: ${consecutiveSameRoomViolations} kali.`
    );
  }

  if (options.balanceGradeRotation) {
    summaryParts.push('Rotasi kelas bawah (1–3) & atas (4–6) dioptimalkan.');
  }

  const cleanTeacherLoads: ScheduleValidationResult['teacherLoads'] = {};
  Object.entries(teacherLoadMap).forEach(([c, data]) => {
    cleanTeacherLoads[c] = {
      code: data.code,
      name: data.name,
      totalSessions: data.totalSessions,
      lowGradeSessions: data.lowGradeSessions,
      highGradeSessions: data.highGradeSessions,
      consecutiveViolations: data.consecutiveViolations,
    };
  });

  return {
    isValid,
    totalSlots,
    assignedSlots,
    unassignedSlots,
    conflictsCount,
    homeroomTargetCount,
    homeroomMatchedCount,
    homeroomCompliancePercent,
    consecutiveSameRoomViolations,
    gradeImbalanceScore,
    minTeacherLoad,
    maxTeacherLoad,
    maxLoadDelta,
    teacherLoads: cleanTeacherLoads,
    warnings,
    summaryMessage: summaryParts.join(' '),
  };
}

/**
 * Evaluasi skor penalti dari sebuah kandidat jadwal (semakin kecil skor, semakin baik dan optimal)
 */
function calculateSchedulePenaltyScore(
  grid: string[][], // [rowIndex][roomIndex] -> teacherCode
  rooms: string[],
  proctorCodes: string[],
  days: DayGroup[],
  options: AutoGenerateOptions,
  homeroomByRoom: Record<string, string>,
  roomGradeMap: ('low' | 'high' | 'other')[]
): number {
  let score = 0;
  const numRows = grid.length;
  const numRooms = rooms.length;
  const numProctors = proctorCodes.length;

  const totalSlots = numRows * numRooms;
  const idealLoad = totalSlots / (numProctors || 1);
  const minIdealLoad = Math.floor(idealLoad);
  const maxIdealLoad = Math.ceil(idealLoad);

  const teacherTotalLoads: Record<string, number> = {};
  const teacherLowLoads: Record<string, number> = {};
  const teacherHighLoads: Record<string, number> = {};
  const teacherRoomsByDay: Record<string, Record<number, Set<string>>> = {};

  proctorCodes.forEach((c) => {
    teacherTotalLoads[c] = 0;
    teacherLowLoads[c] = 0;
    teacherHighLoads[c] = 0;
    teacherRoomsByDay[c] = {};
  });

  // 1. Cek Konflik Sesi & Kumpulkan Statistik Tugas
  for (let r = 0; r < numRows; r++) {
    const usedInSession = new Set<string>();
    for (let c = 0; c < numRooms; c++) {
      const code = grid[r][c];
      if (!code) {
        score += 100000; // Penalti berat jika ada slot kosong padahal guru cukup
        continue;
      }

      if (usedInSession.has(code)) {
        score += 1000000; // Hard Constraint: TIDAK BOLEH BENTROK
      }
      usedInSession.add(code);

      if (teacherTotalLoads[code] !== undefined) {
        teacherTotalLoads[code] += 1;
        const g = roomGradeMap[c];
        if (g === 'low') teacherLowLoads[code] += 1;
        else if (g === 'high') teacherHighLoads[code] += 1;
      }
    }
  }

  // 2. Cek Wali Kelas Hari Pertama (Hard/Priority Constraint jika opsi aktif)
  if (options.enforceHomeroomDay1 && days.length > 0) {
    const firstDay = days[0];
    firstDay.rowIndices.forEach((rIdx) => {
      for (let c = 0; c < numRooms; c++) {
        const rm = rooms[c];
        const expectedWali = homeroomByRoom[rm];
        if (expectedWali) {
          const actual = grid[rIdx][c];
          if (actual !== expectedWali) {
            score += 50000; // Penalti berat pelanggaran wali kelas hari pertama
          }
        }
      }
    });
  }

  // 3. Cek Pemerataan Beban Mengawas (Fair Load Distribution)
  proctorCodes.forEach((code) => {
    const total = teacherTotalLoads[code] || 0;
    if (total < minIdealLoad) {
      score += (minIdealLoad - total) * 5000;
    } else if (total > maxIdealLoad) {
      score += (total - maxIdealLoad) * 5000;
    }
    // Tambahan penalti varians kuadratis
    const diff = total - idealLoad;
    score += diff * diff * 200;
  });

  // 4. Cek Pengulangan Ruang pada Hari Berikutnya (Consecutive Days)
  if (options.avoidSameRoomConsecutive && days.length > 1) {
    days.forEach((dayGroup) => {
      dayGroup.rowIndices.forEach((rIdx) => {
        for (let c = 0; c < numRooms; c++) {
          const code = grid[rIdx][c];
          if (code) {
            if (!teacherRoomsByDay[code][dayGroup.dayIndex]) {
              teacherRoomsByDay[code][dayGroup.dayIndex] = new Set();
            }
            teacherRoomsByDay[code][dayGroup.dayIndex].add(rooms[c]);
          }
        }
      });
    });

    for (let d = 0; d < days.length - 1; d++) {
      const nextDay = d + 1;
      proctorCodes.forEach((code) => {
        const setD = teacherRoomsByDay[code]?.[d];
        const setNext = teacherRoomsByDay[code]?.[nextDay];
        if (setD && setNext) {
          setD.forEach((rm) => {
            if (setNext.has(rm)) {
              score += 1500; // Penalti ruang sama pada hari berturut-turut
            }
          });
        }
      });
    }
  }

  // 5. Cek Rotasi Jenjang Rendah (1-3) & Tinggi (4-6)
  if (options.balanceGradeRotation) {
    proctorCodes.forEach((code) => {
      const low = teacherLowLoads[code] || 0;
      const high = teacherHighLoads[code] || 0;
      const diff = Math.abs(low - high);
      if (diff > 1) {
        score += (diff - 1) * 120;
      }
    });
  }

  return score;
}

/**
 * Mesin Utama Smart Exam Schedule Generator
 * Menggunakan pendekatan Constraint-Based Multi-Start + Simulated Local Optimization
 */
export function generateSmartExamSchedule(
  currentSchedule: ActiveExamSchedule,
  options: AutoGenerateOptions
): GenerateSmartScheduleResult {
  const rooms = Array.from(
    new Set(
      (currentSchedule.rooms && currentSchedule.rooms.length > 0
        ? currentSchedule.rooms
        : DEFAULT_EXAM_ROOMS
      )
        .map((r) => normalizeCode(r))
        .filter(Boolean)
    )
  );

  const rawProctors =
    currentSchedule.proctorCodes && currentSchedule.proctorCodes.length > 0
      ? currentSchedule.proctorCodes
      : [];

  const proctors = rawProctors
    .map((p) => ({
      ...p,
      code: normalizeCode(p.code),
      name: String(p.name ?? '').trim(),
      subjectOrRole: String(p.subjectOrRole ?? '').trim(),
    }))
    .filter((p) => p.code && p.name);

  if (proctors.length === 0) {
    throw new Error('Daftar kode guru masih kosong. Silakan tambahkan kode guru terlebih dahulu.');
  }

  const rows = currentSchedule.rows || [];
  if (rows.length === 0) {
    throw new Error('Tidak ada baris jadwal sesi ujian yang tersedia untuk di-generate.');
  }

  const proctorCodesList = proctors.map((p) => p.code);
  const proctorMap: Record<string, string> = {};
  proctors.forEach((p) => {
    proctorMap[p.code] = p.name;
  });

  const days = groupRowsIntoDays(rows);
  const roomGradeMap = rooms.map((rm) => getGradeGroup(rm));

  // Buat homeroom map yang ternormalisasi & valid
  const homeroomByRoom: Record<string, string> = {};
  rooms.forEach((rm) => {
    const rawH = normalizeCode(options.homeroomMap[rm]);
    if (rawH && proctorCodesList.includes(rawH)) {
      homeroomByRoom[rm] = rawH;
    }
  });

  const numRows = rows.length;
  const numRooms = rooms.length;

  if (rooms.length > proctors.length) {
    console.warn(
      `Jumlah ruang (${rooms.length}) lebih banyak dari jumlah guru (${proctors.length}). Beberapa ruang mungkin tidak terisi.`
    );
  }

  // Tentukan slot mana saja yang merupakan Hard Constraint Wali Kelas
  const isProtectedSlot: boolean[][] = Array.from({ length: numRows }, () =>
    Array(numRooms).fill(false)
  );

  if (options.enforceHomeroomDay1 && days.length > 0) {
    const firstDay = days[0];
    firstDay.rowIndices.forEach((rIdx) => {
      rooms.forEach((rm, cIdx) => {
        if (homeroomByRoom[rm]) {
          isProtectedSlot[rIdx][cIdx] = true;
        }
      });
    });
  }

  // Multi-Start Constructive Search
  let bestGrid: string[][] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  const NUM_STARTS = 35; // Multi-start trials
  const LOCAL_SEARCH_ITERATIONS = 400; // Iterasi perbaikan lokal per start

  for (let trial = 0; trial < NUM_STARTS; trial++) {
    // Inisialisasi grid
    const currentGrid: string[][] = Array.from({ length: numRows }, () =>
      Array(numRooms).fill('')
    );

    const teacherRunningLoads: Record<string, number> = {};
    const teacherLowRunning: Record<string, number> = {};
    const teacherHighRunning: Record<string, number> = {};
    const teacherLastDayAssigned: Record<string, Record<string, number>> = {}; // code -> room -> lastDayIndex

    proctorCodesList.forEach((c) => {
      teacherRunningLoads[c] = 0;
      teacherLowRunning[c] = 0;
      teacherHighRunning[c] = 0;
      teacherLastDayAssigned[c] = {};
    });

    // 1. Tempatkan Wali Kelas Hari Pertama terlebih dahulu
    if (options.enforceHomeroomDay1 && days.length > 0) {
      const firstDay = days[0];
      firstDay.rowIndices.forEach((rIdx) => {
        rooms.forEach((rm, cIdx) => {
          const wali = homeroomByRoom[rm];
          if (wali) {
            currentGrid[rIdx][cIdx] = wali;
            teacherRunningLoads[wali] += 1;
            const g = roomGradeMap[cIdx];
            if (g === 'low') teacherLowRunning[wali] += 1;
            else if (g === 'high') teacherHighRunning[wali] += 1;
            teacherLastDayAssigned[wali][rm] = 0;
          }
        });
      });
    }

    // 2. Isi slot yang tersisa dengan Greedy Weighted Random Selection
    for (let d = 0; d < days.length; d++) {
      const dayGroup = days[d];
      for (const rIdx of dayGroup.rowIndices) {
        const usedInSession = new Set<string>();

        // Catat yang sudah terisi di sesi ini (misal wali kelas)
        for (let c = 0; c < numRooms; c++) {
          if (currentGrid[rIdx][c]) {
            usedInSession.add(currentGrid[rIdx][c]);
          }
        }

        // Acak urutan pengisian ruangan agar tidak selalu urut dari 1A ke 6B
        const roomIndices = Array.from({ length: numRooms }, (_, i) => i).sort(
          () => Math.random() - 0.5
        );

        for (const cIdx of roomIndices) {
          if (currentGrid[rIdx][cIdx]) continue; // Sudah terisi

          const rm = rooms[cIdx];
          const gradeCat = roomGradeMap[cIdx];

          // Kandidat guru yang belum bertugas di sesi ini
          const availableTeachers = proctorCodesList.filter((c) => !usedInSession.has(c));

          if (availableTeachers.length === 0) {
            currentGrid[rIdx][cIdx] = '';
            continue;
          }

          // Hitung skor kelayakan untuk setiap kandidat
          const scoredCandidates = availableTeachers.map((code) => {
            let candidateScore = 0;

            // 1. Bobot Beban (prioritas guru dengan tugas paling sedikit)
            candidateScore += (teacherRunningLoads[code] || 0) * 100;

            // 2. Bobot Pengulangan Ruang Hari Berturut-turut
            if (options.avoidSameRoomConsecutive) {
              const lastDay = teacherLastDayAssigned[code]?.[rm];
              if (lastDay !== undefined && lastDay === d - 1) {
                candidateScore += 250; // Penalti ruang sama hari sebelumnya
              }
            }

            // 3. Bobot Keseimbangan Jenjang (kelas 1-3 vs 4-6)
            if (options.balanceGradeRotation) {
              const low = teacherLowRunning[code] || 0;
              const high = teacherHighRunning[code] || 0;
              if (gradeCat === 'low' && low > high) {
                candidateScore += (low - high) * 30;
              } else if (gradeCat === 'high' && high > low) {
                candidateScore += (high - low) * 30;
              }
            }

            // Noise acak kecil untuk diversifikasi multi-start
            candidateScore += Math.random() * 8;

            return { code, score: candidateScore };
          });

          scoredCandidates.sort((a, b) => a.score - b.score);
          const chosenCode = scoredCandidates[0].code;

          currentGrid[rIdx][cIdx] = chosenCode;
          usedInSession.add(chosenCode);

          teacherRunningLoads[chosenCode] += 1;
          if (gradeCat === 'low') teacherLowRunning[chosenCode] += 1;
          else if (gradeCat === 'high') teacherHighRunning[chosenCode] += 1;
          teacherLastDayAssigned[chosenCode][rm] = d;
        }
      }
    }

    // 3. Fase Local Search Optimization (Swaps)
    let currentScore = calculateSchedulePenaltyScore(
      currentGrid,
      rooms,
      proctorCodesList,
      days,
      options,
      homeroomByRoom,
      roomGradeMap
    );

    for (let iter = 0; iter < LOCAL_SEARCH_ITERATIONS; iter++) {
      // Pilih 1 baris/sesi secara acak
      const rIdx = Math.floor(Math.random() * numRows);

      // Pilih 2 ruang secara acak pada baris tersebut
      const c1 = Math.floor(Math.random() * numRooms);
      const c2 = Math.floor(Math.random() * numRooms);
      if (c1 === c2) continue;

      // Jangan tukar slot yang dilindungi (wali kelas hari pertama)
      if (isProtectedSlot[rIdx][c1] || isProtectedSlot[rIdx][c2]) continue;

      const code1 = currentGrid[rIdx][c1];
      const code2 = currentGrid[rIdx][c2];
      if (!code1 || !code2 || code1 === code2) continue;

      // Coba tukar
      currentGrid[rIdx][c1] = code2;
      currentGrid[rIdx][c2] = code1;

      const newScore = calculateSchedulePenaltyScore(
        currentGrid,
        rooms,
        proctorCodesList,
        days,
        options,
        homeroomByRoom,
        roomGradeMap
      );

      if (newScore <= currentScore) {
        currentScore = newScore;
      } else {
        // Revert jika tidak menghasilkan perbaikan
        currentGrid[rIdx][c1] = code1;
        currentGrid[rIdx][c2] = code2;
      }
    }

    // Bandingkan dengan bestGrid keseluruhan
    if (currentScore < bestScore) {
      bestScore = currentScore;
      bestGrid = currentGrid.map((row) => [...row]);
    }
  }

  if (!bestGrid) {
    throw new Error('Gagal menghasilkan jadwal pengawas yang optimal.');
  }

  // Terapkan hasil bestGrid ke rows
  const updatedRows: ExamScheduleRow[] = rows.map((row, rIdx) => {
    const rowCodes: Record<string, string> = {};
    const proctorDetails: ExamProctorAssignment[] = [];

    rooms.forEach((rm, cIdx) => {
      const code = bestGrid![rIdx][cIdx];
      rowCodes[rm] = code || '';
      if (code) {
        proctorDetails.push({
          roomOrClass: rm,
          proctorCode: code,
          proctorName: proctorMap[code] || `Guru [${code}]`,
        });
      }
    });

    return {
      ...row,
      roomCodes: rowCodes,
      proctorDetails,
    };
  });

  const finalRows = syncRowsWithProctors(updatedRows, rooms, proctorMap);
  const validation = validateScheduleAssignments(
    finalRows,
    rooms,
    proctors,
    options,
    days
  );

  const teacherSessionCounts: Record<string, number> = {};
  Object.entries(validation.teacherLoads).forEach(([code, data]) => {
    teacherSessionCounts[code] = data.totalSessions;
  });

  return {
    updatedRows: finalRows,
    validation,
    stats: {
      teacherSessionCounts,
      warnings: validation.warnings,
    },
  };
}
