import {
  AnalysisSession,
  AnalysisSubject,
  ExamType,
  AnalysisQuestionConfig,
} from '../../types/analysisTypes';
import { Student } from '../studentStorage';
import { calculateMaxScore, evaluateStudentResult } from './analysisCalculationService';

const ACTIVE_SESSION_STORAGE_KEY = 'sdit_analysis_active_session';
const SAVED_SESSIONS_STORAGE_KEY = 'sdit_analysis_saved_sessions_list';
const CLASS_SESSIONS_MAP_KEY = 'sdit_analysis_class_sessions_map';

/**
 * Buat ID Sesi yang unik
 */
export function generateSessionId(classId: string, examType: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const safeClass = (classId || 'CLASS').replace(/[^a-zA-Z0-9]/g, '');
  const safeExam = (examType || 'EXAM').replace(/[^a-zA-Z0-9]/g, '');
  return `SESI_${safeClass}_${safeExam}_${timestamp}_${randomSuffix}`;
}

/**
 * Ambil semua sesi kelas yang tersimpan
 */
export function getAllClassSessions(): Record<string, AnalysisSession> {
  try {
    const raw = localStorage.getItem(CLASS_SESSIONS_MAP_KEY);
    if (!raw) return {};
    const map = JSON.parse(raw);
    return typeof map === 'object' && map !== null ? map : {};
  } catch (err) {
    console.error('Failed to parse all class sessions:', err);
    return {};
  }
}

/**
 * Ambil sesi spesifik untuk kelas tertentu
 */
export function getSessionForClass(classId: string): AnalysisSession | null {
  if (!classId) return null;
  const key = classId.toLowerCase().trim();
  const all = getAllClassSessions();
  if (all[key]) {
    return all[key];
  }
  const active = getActiveSession();
  if (active && active.classId.toLowerCase().trim() === key) {
    return active;
  }
  return null;
}

/**
 * Simpan sesi untuk kelas tertentu
 */
export function saveSessionForClass(session: AnalysisSession): void {
  try {
    if (!session || !session.classId) return;
    session.updatedAt = new Date().toISOString();
    const all = getAllClassSessions();
    const key = session.classId.toLowerCase().trim();
    all[key] = session;
    localStorage.setItem(CLASS_SESSIONS_MAP_KEY, JSON.stringify(all));

    // Jika ini adalah kelas yang sedang aktif, update juga active session
    const active = getActiveSession();
    if (!active || active.classId.toLowerCase().trim() === key) {
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  } catch (err) {
    console.error('Failed to save session for class:', err);
  }
}

/**
 * Buat Sesi Analisis baru
 */
export function createNewSession(params: {
  schoolName?: string;
  classId: string;
  className: string;
  examType: ExamType;
  schoolYear: string;
  teacherName: string;
  analysisDate?: string;
  kktp?: number;
  students: Student[];
}): AnalysisSession {
  const now = new Date();
  const dateStr =
    params.analysisDate ||
    now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const session: AnalysisSession = {
    formatType: 'ANALYSIS_PROJECT',
    formatVersion: 1,
    filePurpose: 'SESSION',
    sessionId: generateSessionId(params.classId, params.examType),
    schoolName: params.schoolName,
    classId: params.classId,
    className: params.className,
    examType: params.examType,
    schoolYear: params.schoolYear || '2026/2027',
    teacherName: params.teacherName || '',
    analysisDate: dateStr,
    kktp: params.kktp && params.kktp > 0 ? params.kktp : 70,
    subjects: [],
    studentSnapshot: params.students.map((s) => ({
      id: s.id,
      name: s.name,
      classId: s.classId,
    })),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    appVersion: '2.0-sdit',
  };

  saveActiveSession(session);
  saveSessionForClass(session);
  return session;
}

/**
 * Simpan sesi yang sedang aktif ke LocalStorage
 */
export function saveActiveSession(session: AnalysisSession): void {
  try {
    session.updatedAt = new Date().toISOString();
    const serialized = JSON.stringify(session);
    localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, serialized);

    // Simpan juga ke map multi-class
    const all = getAllClassSessions();
    if (session.classId) {
      all[session.classId.toLowerCase().trim()] = session;
      localStorage.setItem(CLASS_SESSIONS_MAP_KEY, JSON.stringify(all));
    }

    // Simpan juga ke daftar riwayat sesi tersimpan
    const savedListRaw = localStorage.getItem(SAVED_SESSIONS_STORAGE_KEY);
    const savedList: Array<{
      sessionId: string;
      className: string;
      examType: string;
      schoolYear: string;
      subjectCount: number;
      updatedAt: string;
    }> = savedListRaw ? JSON.parse(savedListRaw) : [];

    const existingIdx = savedList.findIndex((item) => item.sessionId === session.sessionId);
    const summaryItem = {
      sessionId: session.sessionId,
      className: session.className,
      examType: session.examType,
      schoolYear: session.schoolYear,
      subjectCount: session.subjects.length,
      updatedAt: session.updatedAt,
    };

    if (existingIdx >= 0) {
      savedList[existingIdx] = summaryItem;
    } else {
      savedList.unshift(summaryItem);
    }

    // Batasi riwayat 15 sesi terakhir
    localStorage.setItem(SAVED_SESSIONS_STORAGE_KEY, JSON.stringify(savedList.slice(0, 15)));
  } catch (err) {
    console.error('Failed to save active session to localStorage:', err);
  }
}

/**
 * Ambil sesi aktif yang tersimpan di LocalStorage
 */
export function getActiveSession(): AnalysisSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AnalysisSession;
    if (session && session.formatType === 'ANALYSIS_PROJECT') {
      return session;
    }
    return null;
  } catch (err) {
    console.error('Failed to parse active session from localStorage:', err);
    return null;
  }
}

/**
 * Hapus sesi aktif dari LocalStorage
 */
export function clearActiveSession(): void {
  try {
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear active session:', err);
  }
}

/**
 * Hapus sesi Guru Bidang untuk beberapa kelas sekaligus.
 * Hanya menghapus subject yang sedang dipilih,
 * tidak menghapus seluruh sesi kelas.
 */
export function deleteSubjectSessionFromClasses(
  subjectId: string,
  subjectName: string,
  classIds: string[]
): void {
  try {
    const allSessions = getAllClassSessions();

    const targetClassIds = new Set(
      classIds.map((id) => id.toLowerCase().trim())
    );

    targetClassIds.forEach((classId) => {
      const session = allSessions[classId];

      if (!session?.subjects) return;

      const filteredSubjects = session.subjects.filter(
        (subject) =>
          subject.subjectId !== subjectId &&
          subject.subjectName.toLowerCase().trim() !==
            subjectName.toLowerCase().trim()
      );

      // Tidak ada perubahan
      if (filteredSubjects.length === session.subjects.length) {
        return;
      }

if (filteredSubjects.length === 0) {
  allSessions[classId] = {
    ...session,
    subjects: [],
    updatedAt: new Date().toISOString(),
  };
} else {
  allSessions[classId] = {
    ...session,
    subjects: filteredSubjects,
    updatedAt: new Date().toISOString(),
  };
}
    });

    localStorage.setItem(
      CLASS_SESSIONS_MAP_KEY,
      JSON.stringify(allSessions)
    );

    // Bersihkan active session juga.
    clearActiveSession();
  } catch (err) {
    console.error('Failed to delete subject sessions:', err);
  }
}

/**
 * Tambah Mata Pelajaran ke dalam Sesi
 */
export function addSubjectToSession(
  session: AnalysisSession,
  params: {
    subjectId: string;
    subjectName: string;
    teacherName?: string;
    config: AnalysisQuestionConfig;
    students: Student[];
  }
): AnalysisSession {
  // Bersihkan nama sheet (max 31 karakter, no special characters)
  const safeSheetName = params.subjectName
    .replace(/[\\/*?:[\]]/g, '')
    .trim()
    .substring(0, 28);

  const maxScore = calculateMaxScore(params.config);

  // Cek apakah subjectId sudah ada
  const existingIndex = session.subjects.findIndex((s) => s.subjectId === params.subjectId);

  const newSubject: AnalysisSubject = {
    subjectId: params.subjectId,
    subjectName: params.subjectName,
    teacherName: params.teacherName || session.teacherName,
    sheetName: safeSheetName,
    status: 'in_progress',
    config: params.config,
    studentResults: {},
    maxScore,
    completedStudentsCount: 0,
    updatedAt: new Date().toISOString(),
  };

  const updatedSubjects = [...session.subjects];
  if (existingIndex >= 0) {
    // Preserve existing student results if reconfiguring
    newSubject.studentResults = updatedSubjects[existingIndex].studentResults;
    // Re-evaluate existing results with new maxScore and config
    Object.keys(newSubject.studentResults).forEach((sId) => {
      const currentRes = newSubject.studentResults[sId];
      if (currentRes) {
        newSubject.studentResults[sId] = evaluateStudentResult(
          currentRes.studentId,
          currentRes.studentName,
          currentRes.answers,
          params.config,
          session.kktp
        );
      }
    });
    newSubject.completedStudentsCount = Object.keys(newSubject.studentResults).length;
    updatedSubjects[existingIndex] = newSubject;
  } else {
    updatedSubjects.push(newSubject);
  }

  const updatedSession: AnalysisSession = {
    ...session,
    subjects: updatedSubjects,
    updatedAt: new Date().toISOString(),
  };

  saveActiveSession(updatedSession);
  return updatedSession;
}

/**
 * Hapus Mata Pelajaran dari Sesi
 */
export function removeSubjectFromSession(
  session: AnalysisSession,
  subjectId: string
): AnalysisSession {
  const updatedSubjects = session.subjects.filter((s) => s.subjectId !== subjectId);
  const updatedSession: AnalysisSession = {
    ...session,
    subjects: updatedSubjects,
    updatedAt: new Date().toISOString(),
  };
  saveActiveSession(updatedSession);
  return updatedSession;
}

/**
 * Simpan hasil analisis nilai satu siswa untuk suatu mata pelajaran
 */
export function saveStudentSubjectResult(
  session: AnalysisSession,
  subjectId: string,
  result: {
    studentId: string;
    studentName: string;
    answers: import('../../types/analysisTypes').StudentAnswers;
  }
): AnalysisSession {
  const subjectIndex = session.subjects.findIndex((s) => s.subjectId === subjectId);
  if (subjectIndex < 0) return session;

  const targetSubject = session.subjects[subjectIndex];
  const evaluated = evaluateStudentResult(
    result.studentId,
    result.studentName,
    result.answers,
    targetSubject.config,
    session.kktp
  );

  const updatedStudentResults = {
    ...targetSubject.studentResults,
    [result.studentId]: evaluated,
  };

  const totalCompleted = Object.keys(updatedStudentResults).length;
  const isCompleted =
    session.studentSnapshot.length > 0 &&
    totalCompleted >= session.studentSnapshot.length;

  const updatedSubject: AnalysisSubject = {
    ...targetSubject,
    studentResults: updatedStudentResults,
    completedStudentsCount: totalCompleted,
    status: isCompleted ? 'completed' : 'in_progress',
    updatedAt: new Date().toISOString(),
  };

  const updatedSubjects = [...session.subjects];
  updatedSubjects[subjectIndex] = updatedSubject;

  const updatedSession: AnalysisSession = {
    ...session,
    subjects: updatedSubjects,
    updatedAt: new Date().toISOString(),
  };

  saveActiveSession(updatedSession);
  saveSessionForClass(updatedSession);
  return updatedSession;
}

/**
 * Ambil atau buat sesi untuk kelas tertentu
 */
export function getOrCreateSessionForClass(params: {
  classId: string;
  className: string;
  examType: ExamType;
  schoolYear: string;
  teacherName?: string;
  kktp?: number;
  students: Student[];
}): AnalysisSession {
  const existing = getSessionForClass(params.classId);
  if (existing) {
    const classStudents = params.students.filter(
      (s) => s.classId.toLowerCase() === params.classId.toLowerCase()
    );
    if (classStudents.length > 0 && (!existing.studentSnapshot || existing.studentSnapshot.length === 0)) {
      existing.studentSnapshot = classStudents.map((s) => ({
        id: s.id,
        name: s.name,
        classId: s.classId,
      }));
      saveSessionForClass(existing);
    }
    return existing;
  }

  const classStudents = params.students.filter(
    (s) => s.classId.toLowerCase() === params.classId.toLowerCase()
  );
  return createNewSession({
    classId: params.classId,
    className: params.className,
    examType: params.examType,
    schoolYear: params.schoolYear,
    teacherName: params.teacherName || '',
    kktp: params.kktp || 70,
    students: classStudents,
  });
}

/**
 * Terapkan / Simpan konfigurasi Mata Pelajaran ke banyak kelas sekaligus (Fitur Mode Guru Bidang)
 */
export function saveSubjectConfigToMultipleClasses(params: {
  schoolName?: string;
  subjectId: string;
  subjectName: string;
  teacherName?: string;
  config: AnalysisQuestionConfig;
  targetClassIds: string[];
  masterClasses: import('../../data/masterExamData').MasterClass[];
  students: Student[];
  examType: ExamType;
  schoolYear: string;
  kktp: number;
}): Record<string, AnalysisSession> {
  const allSessions = getAllClassSessions();
  const updatedMap: Record<string, AnalysisSession> = { ...allSessions };
// Kelas yang sebelumnya memiliki mapel ini tetapi sekarang
// tidak dipilih harus dikeluarkan dari konfigurasi Guru Bidang.
const targetClassKeySet = new Set(
  params.targetClassIds.map((id) => id.toLowerCase().trim())
);

Object.keys(updatedMap).forEach((classKey) => {
  if (targetClassKeySet.has(classKey)) return;

  const session = updatedMap[classKey];
  if (!session?.subjects) return;

  const hasSubject = session.subjects.some(
    (subject) =>
      subject.subjectId === params.subjectId ||
      subject.subjectName.toLowerCase().trim() ===
        params.subjectName.toLowerCase().trim()
  );

  if (hasSubject) {
    session.subjects = session.subjects.filter(
      (subject) =>
        subject.subjectId !== params.subjectId &&
        subject.subjectName.toLowerCase().trim() !==
          params.subjectName.toLowerCase().trim()
    );

    session.updatedAt = new Date().toISOString();

    updatedMap[classKey] = session;
    saveSessionForClass(session);
  }
});

  params.targetClassIds.forEach((cId) => {
    const foundClass = params.masterClasses.find(
      (c) => c.id.toLowerCase() === cId.toLowerCase()
    );
    const className = foundClass ? foundClass.name : cId;
    const classStudents = params.students.filter(
      (s) =>
        s.classId.toLowerCase() === cId.toLowerCase() &&
        (!params.schoolName || !s.schoolName || s.schoolName.toLowerCase() === params.schoolName.toLowerCase())
    );

    let session = updatedMap[cId.toLowerCase()];
    if (!session) {
      session = createNewSession({
        schoolName: params.schoolName,
        classId: cId,
        className,
        examType: params.examType,
        schoolYear: params.schoolYear,
        teacherName: foundClass?.waliKelas || '',
        kktp: params.kktp,
        students: classStudents,
      });
    } else {
      if (params.schoolName) {
        session.schoolName = params.schoolName;
      }
      session.kktp = params.kktp || session.kktp;
      session.examType = params.examType || session.examType;
      session.schoolYear = params.schoolYear || session.schoolYear;
      if (classStudents.length > 0) {
        session.studentSnapshot = classStudents.map((s) => ({
          id: s.id,
          name: s.name,
          classId: s.classId,
        }));
      }
    }

    session = addSubjectToSession(session, {
      subjectId: params.subjectId,
      subjectName: params.subjectName,
      teacherName: params.teacherName || session.teacherName,
      config: params.config,
      students: classStudents,
    });

    updatedMap[cId.toLowerCase()] = session;
    saveSessionForClass(session);
  });

  return updatedMap;
}
