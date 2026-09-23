import {
  AnalysisSession,
  AnalysisSubject,
  FileValidationResult,
} from '../../types/analysisTypes';
import { Student } from '../studentStorage';
import { saveActiveSession } from './analysisSessionService';

/**
 * Validasi berkas analisis yang diunggah terhadap sesi aktif
 */
export function validateImportedSession(
  importedSession: AnalysisSession,
  activeSession: AnalysisSession | null,
  currentStudents: Student[]
): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!importedSession || importedSession.formatType !== 'ANALYSIS_PROJECT') {
    return {
      isValid: false,
      filePurpose: 'SESSION',
      errors: ['Format file bukan merupakan Proyek Analisis resmi SDIT AL FIKRI.'],
      warnings: [],
      matchedStudentsCount: 0,
      totalFileStudentsCount: 0,
      conflictingSubjects: [],
      newSubjects: [],
    };
  }

  const filePurpose = importedSession.filePurpose || 'SESSION';

  // 1. Cek Kesesuaian Kelas jika ada Sesi Aktif
  if (activeSession) {
    if (
      importedSession.classId &&
      activeSession.classId &&
      importedSession.classId.toLowerCase() !== activeSession.classId.toLowerCase()
    ) {
      errors.push(
        `Kelas tidak cocok! File ini untuk Kelas "${importedSession.className || importedSession.classId}", sedangkan sesi Anda saat ini adalah Kelas "${activeSession.className || activeSession.classId}".`
      );
    }

    if (
      importedSession.examType &&
      activeSession.examType &&
      importedSession.examType !== activeSession.examType
    ) {
      warnings.push(
        `Jenis ujian berbeda: File adalah "${importedSession.examType}", sesi saat ini adalah "${activeSession.examType}".`
      );
    }
  }

  // 2. Cocokkan Siswa
  const fileStudents = importedSession.studentSnapshot || [];
  let matchedCount = 0;

  fileStudents.forEach((fs) => {
    const isMatch = currentStudents.some(
      (cs) =>
        cs.id === fs.id ||
        cs.name.trim().toLowerCase() === fs.name.trim().toLowerCase()
    );
    if (isMatch) matchedCount++;
  });

  if (fileStudents.length > 0 && matchedCount === 0 && currentStudents.length > 0) {
    warnings.push(
      'Nama-nama siswa dalam file tidak cocok dengan data siswa di database kelas ini. Nilai akan tetap disesuaikan berdasarkan nama yang sama.'
    );
  }

  // 3. Cek Mata Pelajaran yang Konflik vs Baru
  const conflictingSubjects: string[] = [];
  const newSubjects: string[] = [];

  if (activeSession) {
    const existingSubjectIds = new Set(activeSession.subjects.map((s) => s.subjectId));
    const existingSubjectNames = new Set(
      activeSession.subjects.map((s) => s.subjectName.toLowerCase())
    );

    importedSession.subjects.forEach((s) => {
      if (
        existingSubjectIds.has(s.subjectId) ||
        existingSubjectNames.has(s.subjectName.toLowerCase())
      ) {
        conflictingSubjects.push(s.subjectName);
      } else {
        newSubjects.push(s.subjectName);
      }
    });
  } else {
    importedSession.subjects.forEach((s) => {
      newSubjects.push(s.subjectName);
    });
  }

  return {
    isValid: errors.length === 0,
    filePurpose,
    session: importedSession,
    subjectToImport:
      filePurpose === 'SUBJECT_IMPORT' && importedSession.subjects.length > 0
        ? importedSession.subjects[0]
        : undefined,
    errors,
    warnings,
    matchedStudentsCount: matchedCount,
    totalFileStudentsCount: fileStudents.length,
    conflictingSubjects,
    newSubjects,
  };
}

/**
 * Gabungkan (merge) Mata Pelajaran yang diimpor ke dalam Sesi Aktif
 */
export function mergeImportedSubjectsIntoSession(
  activeSession: AnalysisSession,
  importedSession: AnalysisSession,
  currentStudents: Student[],
  conflictResolution: 'OVERWRITE' | 'KEEP_EXISTING'
): AnalysisSession {
  const existingSubjectsMap = new Map<string, AnalysisSubject>();
  activeSession.subjects.forEach((s) => {
    existingSubjectsMap.set(s.subjectId, s);
    existingSubjectsMap.set(s.subjectName.toLowerCase(), s);
  });

  const mergedSubjects: AnalysisSubject[] = [...activeSession.subjects];

  // Helper untuk memetakan ID siswa impor ke ID siswa lokal berdasarkan Nama
  const studentNameToIdMap = new Map<string, string>();
  const studentIdSet = new Set<string>();
  currentStudents.forEach((s) => {
    studentNameToIdMap.set(s.name.trim().toLowerCase(), s.id);
    studentIdSet.add(s.id);
  });

  importedSession.subjects.forEach((importedSubj) => {
    // Normalisasi studentResults dengan ID database lokal jika cocok berdasarkan nama
    const normalizedResults: typeof importedSubj.studentResults = {};
    Object.values(importedSubj.studentResults).forEach((res) => {
      const lowerName = res.studentName.trim().toLowerCase();
      let matchedLocalId = studentNameToIdMap.get(lowerName);

      if (!matchedLocalId) {
        const found = currentStudents.find((cs) => {
          const n = cs.name.trim().toLowerCase();
          return n.includes(lowerName) || lowerName.includes(n);
        });
        if (found) matchedLocalId = found.id;
      }

      const targetId = matchedLocalId || (studentIdSet.has(res.studentId) ? res.studentId : res.studentId);
      normalizedResults[targetId] = {
        ...res,
        studentId: targetId,
      };
    });

    const normalizedSubject: AnalysisSubject = {
      ...importedSubj,
      studentResults: normalizedResults,
      completedStudentsCount: Object.keys(normalizedResults).length,
      status: 'imported',
      updatedAt: new Date().toISOString(),
    };

    const existingByIdIdx = mergedSubjects.findIndex(
      (s) => s.subjectId === importedSubj.subjectId
    );
    const existingByNameIdx = mergedSubjects.findIndex(
      (s) => s.subjectName.toLowerCase() === importedSubj.subjectName.toLowerCase()
    );
    const existingIdx = existingByIdIdx >= 0 ? existingByIdIdx : existingByNameIdx;

    if (existingIdx >= 0) {
      if (conflictResolution === 'OVERWRITE') {
        mergedSubjects[existingIdx] = normalizedSubject;
      }
      // If KEEP_EXISTING, do nothing
    } else {
      mergedSubjects.push(normalizedSubject);
    }
  });

  const updatedSession: AnalysisSession = {
    ...activeSession,
    subjects: mergedSubjects,
    updatedAt: new Date().toISOString(),
  };

  saveActiveSession(updatedSession);
  return updatedSession;
}
