import * as XLSX from 'xlsx';
import {
  RaporStsClassData,
  RaporSubject,
  StudentScoreDetail,
  StudentSubjectRecord,
} from '../types/raporSts';
import {
  AnalysisSubmissionItem,
} from '../types/analysisSubmissionTypes';
import { Student, cleanNisn } from './studentStorage';
import {
  calculateFinalScore,
  generateCompetencyDescription,
  generateTeacherNote,
} from './raporStsService';
import { getLocalAnalysisSubmissions } from './analysisSubmissionService';

/**
 * Result structure of the Analysis to e-Rapor synchronization
 */
export interface AnalysisSyncSubjectDetail {
  subjectName: string;
  raporSubjectName: string;
  studentCount: number;
  averageScore: number;
  passedCount: number;
  remedialCount: number;
}

export interface AnalysisSyncResult {
  updatedClassData: RaporStsClassData;
  syncedSubjects: AnalysisSyncSubjectDetail[];
  totalStudentsUpdated: number;
  skippedSubjects: string[];
}

/**
 * Normalizes subject names to find the closest matching subject in e-Rapor
 */
export function matchRaporSubject(
  inputSubjectName: string,
  raporSubjects: RaporSubject[]
): RaporSubject | null {
  if (!inputSubjectName || !raporSubjects || raporSubjects.length === 0) return null;

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();

  const cleanInput = normalize(inputSubjectName);

  // 1. Direct match by name or code
  for (const subj of raporSubjects) {
    if (normalize(subj.name) === cleanInput || normalize(subj.code) === cleanInput) {
      return subj;
    }
  }

  // 2. Alias dictionary
  const aliases: Record<string, string[]> = {
    pai: ['pendidikanagamaislam', 'paibp', 'pai', 'agamaislam', 'agama', 'pendidikanagama'],
    pancasila: ['pendidikanpancasila', 'pancasila', 'ppkn', 'pkn', 'pp'],
    bahasa_indonesia: ['bahasaindonesia', 'bindonesia', 'bindo', 'bind', 'indonesia'],
    matematika: ['matematika', 'mtk', 'math', 'matematik'],
    ipas: ['ilmupengetahuanalamdansosial', 'ipas', 'ipa', 'ips', 'sains'],
    seni_budaya: ['senibudaya', 'senirupa', 'sbdp', 'senimusik', 'senitari', 'kesenian', 'seni'],
    pjok: ['pendidikanjasmaniolahragadaankesehatan', 'pjok', 'penjas', 'olahraga', 'penjaskes'],
    bahasa_inggris: ['bahasainggris', 'binggris', 'english', 'eng', 'inggris'],
    bahasa_arab: ['bahasaarab', 'arab', 'barab', 'mulokarab'],
    bahasa_sunda: ['bahasasunda', 'sunda', 'bsunda', 'muloksunda'],
    akidah_akhlak: ['akidahakhlak', 'akidah', 'aqidah', 'aqidahakhlaq'],
    fiqih: ['fiqih', 'fikih', 'feqih'],
    quran_hadits: ['alquranhadits', 'quranhadits', 'qurdis', 'alquran'],
    ski: ['sejarahkebudayaanislam', 'ski', 'sejarahislam'],
    tahfidz: ['tahfidz', 'tahfiz', 'tahfidzulquran'],
  };

  for (const subj of raporSubjects) {
    const subjNorm = normalize(subj.name);
    const subjId = subj.id.toLowerCase();
    const subjCode = normalize(subj.code);

    // Check alias mapping
    for (const [key, aliasList] of Object.entries(aliases)) {
      const matchesKey =
        subjId.includes(key) || subjNorm.includes(key) || subjCode.includes(key);
      if (matchesKey) {
        if (aliasList.some((al) => cleanInput.includes(al) || al.includes(cleanInput))) {
          return subj;
        }
      }
    }

    // Substring partial match
    if (
      subjNorm.includes(cleanInput) ||
      cleanInput.includes(subjNorm) ||
      subjCode.includes(cleanInput) ||
      cleanInput.includes(subjCode)
    ) {
      return subj;
    }
  }

  return null;
}

export function normalizeClassCode(id: string): string {
  return (id || '')
    .toUpperCase()
    .replace(/^KELAS\s*/i, '')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * Filter available analysis submissions for a specific class
 */
export function getAvailableSubmissionsForClass(
  classId: string,
  schoolYear?: string
): AnalysisSubmissionItem[] {
  const all = getLocalAnalysisSubmissions();
  const targetNorm = normalizeClassCode(classId);

  return all.filter((sub) => {
    const rawClass = sub.classId || '';
    // Handle multi-class split by comma
    const classTokens = rawClass.split(',').map((c) => normalizeClassCode(c));
    const classMatches =
      classTokens.some((t) => t === targetNorm || t.includes(targetNorm) || targetNorm.includes(t)) ||
      normalizeClassCode(rawClass) === targetNorm;

    if (!classMatches) return false;
    if (schoolYear && sub.schoolYear) {
      const normSubYear = sub.schoolYear.replace(/\s+/g, '').toLowerCase();
      const normTargetYear = schoolYear.replace(/\s+/g, '').toLowerCase();
      return normSubYear === normTargetYear || normSubYear.includes(normTargetYear) || normTargetYear.includes(normSubYear);
    }
    return true;
  });
}

/**
 * Extract map of student scores from a single AnalysisSubmissionItem
 */
export interface ParsedStudentScore {
  studentName: string;
  nisn?: string;
  score: number; // 0-100
}

export interface ParsedSubjectData {
  subjectName: string;
  kktp: number;
  scores: ParsedStudentScore[];
}

export function extractSubjectsFromSubmission(
  submission: AnalysisSubmissionItem,
  targetClassId?: string
): ParsedSubjectData[] {
  const results: ParsedSubjectData[] = [];
  const payload = submission.payload;

  if (!payload) {
    return results;
  }

  const targetNorm = targetClassId ? normalizeClassCode(targetClassId) : '';

  // Helper to extract student scores from an AnalysisSubject
  const parseFromAnalysisSubject = (
    subj: any,
    fallbackSubjName: string,
    studentListRef?: any[]
  ): ParsedSubjectData | null => {
    if (!subj) return null;
    const studentScores: ParsedStudentScore[] = [];
    const resultsMap = subj.studentResults || {};

    // 1. If studentResults map exists (Standard App Format)
    if (typeof resultsMap === 'object' && Object.keys(resultsMap).length > 0) {
      Object.values(resultsMap).forEach((res: any) => {
        if (!res) return;
        const sName = res.studentName || '';
        const grade = res.finalGrade !== undefined && res.finalGrade !== null
          ? Number(res.finalGrade)
          : res.totalScore !== undefined && res.totalScore !== null
          ? Number(res.totalScore)
          : null;

        if (grade !== null && !isNaN(grade)) {
          // Find matching student in studentListRef if available for NISN
          let nisn = res.nisn;
          if (!nisn && Array.isArray(studentListRef)) {
            const foundSt = studentListRef.find(
              (s: any) =>
                s.id === res.studentId ||
                s.name?.trim().toLowerCase() === sName.trim().toLowerCase()
            );
            if (foundSt) nisn = foundSt.nisn;
          }

          studentScores.push({
            studentName: sName,
            nisn,
            score: Math.min(100, Math.max(0, Math.round(grade))),
          });
        }
      });
    }

    // 2. Fallback: studentAnswers map + studentListRef
    if (studentScores.length === 0 && Array.isArray(studentListRef) && subj.studentAnswers) {
      studentListRef.forEach((st: any) => {
        const ans = subj.studentAnswers[st.id];
        if (ans && ans.finalGrade !== undefined && ans.finalGrade !== null) {
          studentScores.push({
            studentName: st.name,
            nisn: st.nisn,
            score: Math.min(100, Math.max(0, Math.round(Number(ans.finalGrade)))),
          });
        }
      });
    }

    if (studentScores.length > 0) {
      return {
        subjectName: subj.subjectName || subj.name || fallbackSubjName,
        kktp: Number(subj.kktp || submission.kktp || 70),
        scores: studentScores,
      };
    }
    return null;
  };

  // Skenario 1: Guru Bidang - Single Class (SubjectTeacherWorkspace)
  if (payload.activeSubjectInSession || payload.mode === 'single_class') {
    const subj = payload.activeSubjectInSession;
    const students = payload.activeClassStudents || payload.students || [];
    const parsed = parseFromAnalysisSubject(subj, submission.subjectName, students);
    if (parsed) {
      results.push(parsed);
      return results;
    }
  }

  // Skenario 2: Guru Bidang - Multi Class (SubjectTeacherWorkspace)
  if (payload.classSessionsMap || payload.mode === 'multi_class') {
    const map = payload.classSessionsMap || {};
    const allStudents = payload.allStudents || payload.students || [];

    Object.entries(map).forEach(([cId, session]: [string, any]) => {
      const sessNorm = normalizeClassCode(cId);
      if (targetNorm && sessNorm !== targetNorm && !cId.includes(targetNorm)) {
        return; // skip classes not matching target
      }

      if (session && Array.isArray(session.subjects)) {
        session.subjects.forEach((subj: any) => {
          const parsed = parseFromAnalysisSubject(
            subj,
            submission.subjectName,
            allStudents
          );
          if (parsed) results.push(parsed);
        });
      }
    });

    if (results.length > 0) return results;
  }

  // Skenario 3: Sesi Paket Lengkap Kelas (SessionDashboard)
  if (payload.session && Array.isArray(payload.session.subjects)) {
    const session = payload.session;
    const students = payload.students || session.studentSnapshot || [];

    session.subjects.forEach((subj: any) => {
      const parsed = parseFromAnalysisSubject(subj, subj.subjectName || submission.subjectName, students);
      if (parsed) {
        results.push(parsed);
      }
    });

    if (results.length > 0) return results;
  }

  // Skenario 4: Generic / Flat Scores Array Fallback
  if (Array.isArray(payload.scores)) {
    const studentScores: ParsedStudentScore[] = [];
    payload.scores.forEach((sc: any) => {
      if (sc && (sc.studentName || sc.name) && (sc.score !== undefined || sc.finalGrade !== undefined)) {
        const grade = Number(sc.score !== undefined ? sc.score : sc.finalGrade);
        if (!isNaN(grade)) {
          studentScores.push({
            studentName: sc.studentName || sc.name,
            nisn: sc.nisn,
            score: Math.min(100, Math.max(0, Math.round(grade))),
          });
        }
      }
    });

    if (studentScores.length > 0) {
      results.push({
        subjectName: submission.subjectName,
        kktp: Number(submission.kktp || 70),
        scores: studentScores,
      });
      return results;
    }
  }

  // Skenario 5: Direct studentResults on payload root
  if (payload.studentResults && typeof payload.studentResults === 'object') {
    const parsed = parseFromAnalysisSubject(
      { studentResults: payload.studentResults },
      submission.subjectName,
      payload.students
    );
    if (parsed) {
      results.push(parsed);
      return results;
    }
  }

  return results;
}

/**
 * Apply parsed subject scores to RaporStsClassData
 */
export function applySubjectScoresToClassData(
  classData: RaporStsClassData,
  parsedSubjects: ParsedSubjectData[],
  allStudents: Student[]
): AnalysisSyncResult {
  // Deep clone classData to prevent direct mutation
  const updatedData: RaporStsClassData = JSON.parse(JSON.stringify(classData));
  const syncedSubjects: AnalysisSyncSubjectDetail[] = [];
  const skippedSubjects: string[] = [];
  const updatedStudentIds = new Set<string>();

  const targetNorm = normalizeClassCode(updatedData.config.classLevel);
  let students = allStudents.filter((st) => {
    const sClass = normalizeClassCode(st.classId);
    return sClass === targetNorm || targetNorm.includes(sClass) || sClass.includes(targetNorm);
  });

  if (students.length === 0) {
    students = allStudents;
  }

  const normalizeName = (n: string) =>
    (n || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();

  parsedSubjects.forEach((parsedSubj) => {
    const matchedRaporSubj = matchRaporSubject(parsedSubj.subjectName, updatedData.subjects);

    if (!matchedRaporSubj) {
      skippedSubjects.push(parsedSubj.subjectName);
      return;
    }

    if (!updatedData.subjectRecords[matchedRaporSubj.id]) {
      updatedData.subjectRecords[matchedRaporSubj.id] = {
        subjectId: matchedRaporSubj.id,
        scores: {},
      };
    }

    const subjectRecord: StudentSubjectRecord = updatedData.subjectRecords[matchedRaporSubj.id];
    const activeTps = (matchedRaporSubj.tpList || []).filter((tp) => tp.isActive !== false);
    const subjectKktp = parsedSubj.kktp || updatedData.config.passingGrade || 70;

    let scoreSum = 0;
    let validScoresCount = 0;
    let passedCount = 0;
    let remedialCount = 0;

    parsedSubj.scores.forEach((sc) => {
      const scNameNorm = normalizeName(sc.studentName);

      // Find matching student by NISN first, then by normalized Name
      const matchedStudent =
        students.find((st) => st.nisn && sc.nisn && cleanNisn(st.nisn) === cleanNisn(sc.nisn)) ||
        students.find((st) => {
          const stNameNorm = normalizeName(st.name);
          return (
            stNameNorm === scNameNorm ||
            (stNameNorm.length >= 3 &&
              scNameNorm.length >= 3 &&
              (stNameNorm.includes(scNameNorm) || scNameNorm.includes(stNameNorm)))
          );
        });

      if (!matchedStudent) return;

      const studentId = matchedStudent.id;
      const stsScore = Math.min(100, Math.max(0, Math.round(sc.score)));
      const isPassed = stsScore >= subjectKktp;

      scoreSum += stsScore;
      validScoresCount++;
      if (isPassed) {
        passedCount++;
      } else {
        remedialCount++;
      }

      // Auto-assign TP Achievement based on KKTP:
      // Score >= KKTP -> All TPs achieved (100 / true)
      // Score < KKTP -> TPs unachieved (0 / false)
      const tpScores: Record<string, number | null> = {};
      const tpAchieved: Record<string, boolean> = {};

      activeTps.forEach((tp) => {
        tpScores[tp.id] = isPassed ? 100 : 0;
        tpAchieved[tp.id] = isPassed;
      });

      const finalScore = calculateFinalScore(
        tpScores,
        activeTps.map((t) => t.id),
        stsScore,
        updatedData.config.tpWeight || 60,
        updatedData.config.stsWeight || 40
      );

      const autoDescription = generateCompetencyDescription(
        matchedStudent.name,
        tpAchieved,
        activeTps,
        stsScore,
        subjectKktp
      );

      const teacherNote = generateTeacherNote(
        matchedStudent.name,
        stsScore,
        isPassed ? activeTps.length : 0,
        activeTps.length,
        subjectKktp
      );

      const existingDetail = subjectRecord.scores[studentId];

      subjectRecord.scores[studentId] = {
        studentId,
        studentName: matchedStudent.name,
        nisn: matchedStudent.nisn || '',
        nis: matchedStudent.nim || '',
        tpScores,
        tpAchieved,
        stsScore,
        finalScore,
        autoDescription,
        customDescription: existingDetail?.customDescription,
        teacherNote: existingDetail?.teacherNote || teacherNote,
      };

      updatedStudentIds.add(studentId);
    });

    if (validScoresCount > 0) {
      syncedSubjects.push({
        subjectName: parsedSubj.subjectName,
        raporSubjectName: matchedRaporSubj.name,
        studentCount: validScoresCount,
        averageScore: Math.round((scoreSum / validScoresCount) * 10) / 10,
        passedCount,
        remedialCount,
      });
    }
  });

  updatedData.lastModified = new Date().toISOString();

  return {
    updatedClassData: updatedData,
    syncedSubjects,
    totalStudentsUpdated: updatedStudentIds.size,
    skippedSubjects,
  };
}

/**
 * Parse an Excel file (.xlsx) exported from Analisis Soal
 */
export async function parseScoresFromAnalysisExcelFile(
  file: File,
  classData: RaporStsClassData,
  allStudents: Student[]
): Promise<AnalysisSyncResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const parsedSubjects: ParsedSubjectData[] = [];

  // 1. Check for hidden metadata sheet (_ANALYSIS_META)
  if (workbook.SheetNames.includes('_ANALYSIS_META')) {
    try {
      const metaSheet = workbook.Sheets['_ANALYSIS_META'];
      const rawJson = metaSheet['A1'] ? String(metaSheet['A1'].v) : '';
      if (rawJson) {
        const metaObj = JSON.parse(rawJson);
        if (metaObj.session && Array.isArray(metaObj.session.subjects)) {
          const fakeSub: AnalysisSubmissionItem = {
            id: 'meta-import',
            submissionType: 'session',
            subjectName: metaObj.session.className || 'Analisis Excel',
            classId: metaObj.session.classId || classData.config.classLevel,
            className: metaObj.session.className || classData.config.classLevel,
            examType: metaObj.session.examType || 'STS1',
            schoolYear: metaObj.session.schoolYear || classData.config.schoolYear,
            teacherName: metaObj.session.teacherName || '',
            kktp: metaObj.session.kktp || 70,
            totalStudents: metaObj.students?.length || 0,
            completedStudents: metaObj.students?.length || 0,
            status: 'disetujui',
            submittedAt: new Date().toISOString(),
            payload: metaObj,
          };
          const extracted = extractSubjectsFromSubmission(fakeSub);
          if (extracted.length > 0) {
            return applySubjectScoresToClassData(classData, extracted, allStudents);
          }
        }
      }
    } catch (e) {
      console.warn('Could not parse _ANALYSIS_META, falling back to sheet parser:', e);
    }
  }

  // 2. Parse individual subject sheets
  workbook.SheetNames.forEach((sheetName) => {
    if (
      sheetName === 'REKAP NILAI' ||
      sheetName === '_ANALYSIS_META' ||
      sheetName.startsWith('_')
    ) {
      return;
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;

    // Convert sheet to row array
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    if (!rows || rows.length < 11) return;

    // Read Subject Name and KKTP from header rows (Row 1-8)
    let subjectName = sheetName;
    let kktp = 70;

    for (let r = 0; r < Math.min(8, rows.length); r++) {
      const row = rows[r] || [];
      const rowStr = row.map((c) => String(c || '')).join(' ');
      if (rowStr.toLowerCase().includes('mata pelajaran')) {
        const parts = rowStr.split(':');
        if (parts[1]) subjectName = parts[1].trim();
      }
      if (rowStr.toLowerCase().includes('kktp') || rowStr.toLowerCase().includes('kkm')) {
        const match = rowStr.match(/\d+/);
        if (match) kktp = parseInt(match[0], 10);
      }
    }

    // Find student rows starting from row 10 or 11
    const studentScores: ParsedStudentScore[] = [];

    for (let r = 9; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !Array.isArray(row)) continue;

      const nameCell = row[1]; // Column B is usually Student Name
      if (!nameCell || typeof nameCell !== 'string' || nameCell.trim().length < 2) continue;

      const cleanName = nameCell.trim();
      if (
        cleanName.toLowerCase().includes('jumlah') ||
        cleanName.toLowerCase().includes('rata-rata') ||
        cleanName.toLowerCase().includes('tertinggi') ||
        cleanName.toLowerCase().includes('terendah') ||
        cleanName.toLowerCase().includes('keterangan')
      ) {
        continue;
      }

      // Column BO is index 66 in 0-indexed Excel (or search for Nilai Akhir in row)
      let scoreVal: number | null = null;

      // Try column 66 (BO)
      if (row[66] !== undefined && typeof row[66] === 'number') {
        scoreVal = row[66];
      } else {
        // Find last numeric value in the row before L/TL columns
        for (let c = row.length - 1; c >= 2; c--) {
          const val = row[c];
          if (typeof val === 'number' && !isNaN(val) && val >= 0 && val <= 100) {
            scoreVal = val;
            break;
          }
        }
      }

      if (scoreVal !== null) {
        studentScores.push({
          studentName: cleanName,
          score: scoreVal,
        });
      }
    }

    if (studentScores.length > 0) {
      parsedSubjects.push({
        subjectName,
        kktp,
        scores: studentScores,
      });
    }
  });

  return applySubjectScoresToClassData(classData, parsedSubjects, allStudents);
}
