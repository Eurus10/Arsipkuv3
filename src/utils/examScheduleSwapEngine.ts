import { ExamScheduleRow, ExamProctorCodeItem } from '../types';

export interface TeacherLoadItem {
  code: string;
  name: string;
  subjectOrRole?: string;
  totalSessions: number;
  assignments: Array<{
    rowIndex: number;
    rowId?: string;
    day: string;
    date?: string;
    session: string;
    subject: string;
    room: string;
  }>;
}

export interface ConflictItem {
  rowIndex: number;
  rowId?: string;
  day: string;
  date?: string;
  session: string;
  subject: string;
  teacherCode: string;
  rooms: string[];
}

export interface SwapRecommendation {
  type: 'swap' | 'substitute';
  score: number; // Higher is better
  targetTeacherCode: string;
  targetTeacherName: string;
  targetSubjectOrRole?: string;
  reason: string;
  // For 'swap' type: the other duty to swap with
  swapWith?: {
    rowIndex: number;
    rowId?: string;
    day: string;
    date?: string;
    session: string;
    subject: string;
    room: string;
  };
  // Load impact preview
  sourceBeforeLoad: number;
  sourceAfterLoad: number;
  targetBeforeLoad: number;
  targetAfterLoad: number;
}

/**
 * Calculate teacher load statistics in real-time from the editor rows
 */
export function calculateTeacherLoads(
  rows: ExamScheduleRow[],
  proctorCodes: ExamProctorCodeItem[]
): TeacherLoadItem[] {
  const map: Record<string, TeacherLoadItem> = {};

  proctorCodes.forEach((p) => {
    const upper = p.code.trim().toUpperCase();
    if (!upper) return;
    map[upper] = {
      code: upper,
      name: p.name,
      subjectOrRole: p.subjectOrRole,
      totalSessions: 0,
      assignments: [],
    };
  });

  rows.forEach((row, rIdx) => {
    if (row.roomCodes) {
      Object.entries(row.roomCodes).forEach(([room, code]) => {
        const upper = (code || '').trim().toUpperCase();
        if (!upper || upper === '—' || upper === '-') return;

        if (!map[upper]) {
          map[upper] = {
            code: upper,
            name: `Guru [${upper}]`,
            subjectOrRole: '',
            totalSessions: 0,
            assignments: [],
          };
        }

        map[upper].totalSessions += 1;
        map[upper].assignments.push({
          rowIndex: rIdx,
          rowId: row.id,
          day: row.day,
          date: row.date,
          session: row.session,
          subject: row.subject,
          room: room,
        });
      });
    }
  });

  return Object.values(map).sort((a, b) => b.totalSessions - a.totalSessions);
}

/**
 * Detect conflicts (same teacher assigned to multiple rooms in the same row / session)
 */
export function detectScheduleConflicts(
  rows: ExamScheduleRow[]
): ConflictItem[] {
  const conflicts: ConflictItem[] = [];

  rows.forEach((row, rIdx) => {
    if (!row.roomCodes) return;

    const teacherRooms: Record<string, string[]> = {};
    Object.entries(row.roomCodes).forEach(([room, code]) => {
      const upper = (code || '').trim().toUpperCase();
      if (!upper || upper === '—' || upper === '-') return;

      if (!teacherRooms[upper]) {
        teacherRooms[upper] = [];
      }
      teacherRooms[upper].push(room);
    });

    Object.entries(teacherRooms).forEach(([code, rooms]) => {
      if (rooms.length > 1) {
        conflicts.push({
          rowIndex: rIdx,
          rowId: row.id,
          day: row.day,
          date: row.date,
          session: row.session,
          subject: row.subject,
          teacherCode: code,
          rooms: rooms,
        });
      }
    });
  });

  return conflicts;
}

/**
 * Generate smart swap and substitution recommendations for a specific duty
 */
export function generateSwapRecommendations(params: {
  currentRows: ExamScheduleRow[];
  proctorCodes: ExamProctorCodeItem[];
  sourceRowIndex: number;
  sourceRoom: string;
  sourceTeacherCode: string;
}): SwapRecommendation[] {
  const { currentRows, proctorCodes, sourceRowIndex, sourceRoom, sourceTeacherCode } = params;
  const upperSourceCode = sourceTeacherCode.trim().toUpperCase();
  const sourceRow = currentRows[sourceRowIndex];
  if (!sourceRow) return [];

  const teacherLoads = calculateTeacherLoads(currentRows, proctorCodes);
  const teacherLoadMap = new Map(teacherLoads.map((t) => [t.code, t]));
  const codeToTeacherMap = new Map(proctorCodes.map((p) => [p.code.toUpperCase(), p]));

  const sourceLoad = teacherLoadMap.get(upperSourceCode)?.totalSessions || 0;
  const avgLoad =
    teacherLoads.length > 0
      ? teacherLoads.reduce((acc, t) => acc + t.totalSessions, 0) / teacherLoads.length
      : 0;

  // Set of teacher codes currently busy in sourceRow
  const busyInSourceRow = new Set<string>();
  if (sourceRow.roomCodes) {
    Object.values(sourceRow.roomCodes).forEach((c) => {
      const u = (c || '').trim().toUpperCase();
      if (u && u !== '—' && u !== '-') {
        busyInSourceRow.add(u);
      }
    });
  }

  const recommendations: SwapRecommendation[] = [];

  // =========================================================================
  // TYPE 1: DIRECT 1-ON-1 SWAP (Tukar Sesi Silang)
  // Find another duty (otherRow, otherRoom, otherTeacher) where:
  // - otherTeacher is FREE in sourceRow
  // - sourceTeacher is FREE in otherRow
  // - otherRow != sourceRow
  // =========================================================================
  currentRows.forEach((otherRow, otherRIdx) => {
    if (otherRIdx === sourceRowIndex) return; // Same session cannot swap
    if (!otherRow.roomCodes) return;

    // Check who is busy in otherRow
    const busyInOtherRow = new Set<string>();
    Object.values(otherRow.roomCodes).forEach((c) => {
      const u = (c || '').trim().toUpperCase();
      if (u && u !== '—' && u !== '-') {
        busyInOtherRow.add(u);
      }
    });

    // If sourceTeacher is already busy in otherRow, they can't take this duty!
    if (busyInOtherRow.has(upperSourceCode)) {
      return;
    }

    Object.entries(otherRow.roomCodes).forEach(([otherRoom, code]) => {
      const upperTargetCode = (code || '').trim().toUpperCase();
      if (!upperTargetCode || upperTargetCode === '—' || upperTargetCode === '-') return;
      if (upperTargetCode === upperSourceCode) return; // Same teacher

      // Target teacher must be free in sourceRow
      if (busyInSourceRow.has(upperTargetCode)) {
        return;
      }

      const targetTeacher = codeToTeacherMap.get(upperTargetCode);
      const targetLoad = teacherLoadMap.get(upperTargetCode)?.totalSessions || 0;

      // Calculate score for ranking
      let score = 100;
      // Bonus if swap is on a different day (good cross-day swap)
      if (otherRow.day !== sourceRow.day) {
        score += 20;
      }
      // Bonus if target teacher has similar load
      const loadDiff = Math.abs(targetLoad - sourceLoad);
      score -= loadDiff * 5;

      recommendations.push({
        type: 'swap',
        score,
        targetTeacherCode: upperTargetCode,
        targetTeacherName: targetTeacher?.name || `Guru [${upperTargetCode}]`,
        targetSubjectOrRole: targetTeacher?.subjectOrRole,
        reason: `Tukar dengan jadwal di ${otherRow.day} (${otherRow.session}), R.${otherRoom}. Beban sesi kedua guru tetap utuh (${sourceLoad} & ${targetLoad} sesi).`,
        swapWith: {
          rowIndex: otherRIdx,
          rowId: otherRow.id,
          day: otherRow.day,
          date: otherRow.date,
          session: otherRow.session,
          subject: otherRow.subject,
          room: otherRoom,
        },
        sourceBeforeLoad: sourceLoad,
        sourceAfterLoad: sourceLoad, // Zero-sum change in swap
        targetBeforeLoad: targetLoad,
        targetAfterLoad: targetLoad,
      });
    });
  });

  // =========================================================================
  // TYPE 2: DIRECT SUBSTITUTION (Pengganti Langsung / Bantuan)
  // Target teacher takes over this duty without swapping back:
  // - Target teacher must be FREE in sourceRow
  // - Priority given to teachers with the lowest load (under quota)
  // =========================================================================
  proctorCodes.forEach((teacher) => {
    const upperTargetCode = teacher.code.trim().toUpperCase();
    if (!upperTargetCode || upperTargetCode === upperSourceCode) return;

    // Must be free in sourceRow
    if (busyInSourceRow.has(upperTargetCode)) return;

    const targetLoad = teacherLoadMap.get(upperTargetCode)?.totalSessions || 0;

    let score = 80;
    // Prefer teachers with lower load to balance overall distribution
    if (targetLoad < avgLoad) {
      score += (avgLoad - targetLoad) * 15;
    } else {
      score -= (targetLoad - avgLoad) * 10;
    }

    recommendations.push({
      type: 'substitute',
      score,
      targetTeacherCode: upperTargetCode,
      targetTeacherName: teacher.name,
      targetSubjectOrRole: teacher.subjectOrRole,
      reason: `Bebas di sesi ${sourceRow.day} (${sourceRow.session}). Saat ini memiliki ${targetLoad} sesi (${
        targetLoad < avgLoad ? 'di bawah rata-rata' : 'normal'
      }).`,
      sourceBeforeLoad: sourceLoad,
      sourceAfterLoad: Math.max(0, sourceLoad - 1),
      targetBeforeLoad: targetLoad,
      targetAfterLoad: targetLoad + 1,
    });
  });

  // Sort recommendations by score descending
  return recommendations.sort((a, b) => b.score - a.score);
}
