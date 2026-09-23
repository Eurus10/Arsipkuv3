import {
  AnalysisQuestionConfig,
  AnalysisSubject,
  AnalysisSession,
  StudentAnswers,
  StudentSubjectResult,
  SubjectItemAnalysis,
  SubjectSummaryStats,
  SessionStudentRekapRow,
} from '../../types/analysisTypes';
import { Student } from '../studentStorage';

/**
 * Hitung skor maksimal dari konfigurasi soal
 * Skor Maksimal = (Jumlah PG × Bobot PG) + (Jumlah Isian × Bobot Isian) + (Jumlah Bagian C × Bobot C)
 */
export function calculateMaxScore(config: AnalysisQuestionConfig): number {
  const pgMax = (Math.max(0, config.pgCount) || 0) * (Math.max(0, config.pgWeight) || 1);
  const isianMax = (Math.max(0, config.isianCount) || 0) * (Math.max(0, config.isianWeight) || 1);
  const cMax = (Math.max(0, config.cCount) || 0) * (Math.max(0, config.cWeight) || 2);
  const total = pgMax + isianMax + cMax;
  return total > 0 ? total : 100; // Fallback jika 0
}

/**
 * Buat jawaban default untuk siswa baru:
 * Default semua soal bernilai 1 (Benar / Hijau) untuk mempermudah guru.
 * Guru tinggal mengklik nomor soal yang salah (menjadi 0).
 */
export function createDefaultStudentAnswers(config: AnalysisQuestionConfig): StudentAnswers {
  const pgAnswers: number[] = [];
  for (let i = 0; i < config.pgCount; i++) {
    pgAnswers.push(1); // Default Benar = 1
  }

const isianAnswers: number[] = [];
for (let i = 0; i < config.isianCount; i++) {
  isianAnswers.push(config.isianWeight); // Default Benar = bobot penuh
}

  const cAnswers: number[] = [];
  for (let i = 0; i < config.cCount; i++) {
    // Default nilai penuh untuk bagian C atau bobotnya
    cAnswers.push(config.cWeight);
  }

  return {
    pg: pgAnswers,
    isian: isianAnswers,
    c: cAnswers,
  };
}

/**
 * Hitung total skor yang diperoleh siswa
 */
export function calculateStudentTotalScore(
  answers: StudentAnswers,
  config: AnalysisQuestionConfig
): number {
  let pgScore = 0;
  for (let i = 0; i < config.pgCount; i++) {
    const val = answers.pg[i] !== undefined ? answers.pg[i] : 1;
    // Jika 1 bernilai bobot penuh, 0 bernilai 0
    pgScore += (val > 0 ? 1 : 0) * config.pgWeight;
  }

  let isianScore = 0;
  for (let i = 0; i < config.isianCount; i++) {
    const val = answers.isian[i] !== undefined ? answers.isian[i] : 1;
    // Jika isian berbobot > 1, ambil skor langsung atau jika 1/0 kalikan bobot
    if (config.isianWeight > 1) {
      isianScore += Math.min(config.isianWeight, Math.max(0, val));
    } else {
      isianScore += (val > 0 ? 1 : 0) * config.isianWeight;
    }
  }

  let cScore = 0;
  for (let i = 0; i < config.cCount; i++) {
    const val = answers.c[i] !== undefined ? answers.c[i] : config.cWeight;
    cScore += Math.min(config.cWeight, Math.max(0, val));
  }

  return pgScore + isianScore + cScore;
}

/**
 * Hitung nilai akhir siswa (Skala 0 - 100) dan status kelulusan (L / TL)
 * Nilai = (Skor Diperoleh / Skor Maksimal) × 100
 * Aturan kelulusan: Nilai >= KKTP -> L, Nilai < KKTP -> TL
 */
export function evaluateStudentResult(
  studentId: string,
  studentName: string,
  answers: StudentAnswers,
  config: AnalysisQuestionConfig,
  kktp: number
): StudentSubjectResult {
  const maxScore = calculateMaxScore(config);
  const totalScore = calculateStudentTotalScore(answers, config);
  
  // Hitung nilai akhir dengan pembulatan ke bilangan bulat terdekat (contoh: 97.8765 -> 98)
  const rawGrade = (totalScore / maxScore) * 100;
  const finalGrade = Math.round(rawGrade);
  
  // Nilai tepat KKTP (misal 70) = L
  const isPassed = finalGrade >= kktp;

  return {
    studentId,
    studentName,
    answers,
    totalScore,
    finalGrade,
    isPassed,
  };
}

/**
 * Hitung analisis per butir soal untuk satu mata pelajaran
 */
export function calculateItemAnalysis(
  subject: AnalysisSubject,
  students: Student[]
): SubjectItemAnalysis[] {
  const items: SubjectItemAnalysis[] = [];
  const results = Object.values(subject.studentResults);
  const totalStudents = students.length || results.length || 1;
  const config = subject.config;

  let currentNum = 1;

  // PG
  for (let i = 0; i < config.pgCount; i++) {
    let correctCount = 0;
    results.forEach((res) => {
      if (res.answers.pg[i] === 1) {
        correctCount++;
      }
    });

    const percentage = totalStudents > 0 ? Math.round((correctCount / totalStudents) * 100) : 0;
    items.push({
      questionNumber: currentNum++,
      questionType: 'PG',
      label: `PG ${i + 1}`,
      maxScore: config.pgWeight,
      correctCount,
      totalAnswered: results.length,
      percentage,
    });
  }

  // Isian
  for (let i = 0; i < config.isianCount; i++) {
    let correctCount = 0;
    results.forEach((res) => {
      if ((res.answers.isian[i] || 0) >= 1) {
        correctCount++;
      }
    });

    const percentage = totalStudents > 0 ? Math.round((correctCount / totalStudents) * 100) : 0;
    items.push({
      questionNumber: currentNum++,
      questionType: 'ISIAN',
      label: `Isian ${i + 1}`,
      maxScore: config.isianWeight,
      correctCount,
      totalAnswered: results.length,
      percentage,
    });
  }

  // Bagian C
  for (let i = 0; i < config.cCount; i++) {
    let totalCScore = 0;
    results.forEach((res) => {
      totalCScore += res.answers.c[i] || 0;
    });

    const maxPossible = totalStudents * config.cWeight;
    const percentage = maxPossible > 0 ? Math.round((totalCScore / maxPossible) * 100) : 0;
    items.push({
      questionNumber: currentNum++,
      questionType: 'C',
      label: `${config.cType || 'Uraian'} ${i + 1}`,
      maxScore: config.cWeight,
      correctCount: totalCScore, // total skor yang diperoleh
      totalAnswered: results.length,
      percentage,
    });
  }

  return items;
}

/**
 * Hitung statistik ringkasan mata pelajaran
 */
export function calculateSubjectSummaryStats(
  subject: AnalysisSubject,
  students: Student[],
  kktp: number
): SubjectSummaryStats {
  const results = Object.values(subject.studentResults);
  const completedStudents = results.length;
  const totalStudents = students.length || completedStudents;

  if (completedStudents === 0) {
    return {
      totalStudents,
      completedStudents: 0,
      averageGrade: 0,
      highestGrade: 0,
      lowestGrade: 0,
      passedCount: 0,
      failedCount: 0,
      passedPercentage: 0,
      itemAnalysis: calculateItemAnalysis(subject, students),
    };
  }

  let totalGrades = 0;
  let highest = -Infinity;
  let lowest = Infinity;
  let passedCount = 0;
  let failedCount = 0;

  results.forEach((r) => {
    totalGrades += r.finalGrade;
    if (r.finalGrade > highest) highest = r.finalGrade;
    if (r.finalGrade < lowest) lowest = r.finalGrade;
    if (r.finalGrade >= kktp) {
      passedCount++;
    } else {
      failedCount++;
    }
  });

  const averageGrade = Math.round((totalGrades / completedStudents) * 100) / 100;
  const passedPercentage = Math.round((passedCount / completedStudents) * 100);

  return {
    totalStudents,
    completedStudents,
    averageGrade,
    highestGrade: highest === -Infinity ? 0 : highest,
    lowestGrade: lowest === Infinity ? 0 : lowest,
    passedCount,
    failedCount,
    passedPercentage,
    itemAnalysis: calculateItemAnalysis(subject, students),
  };
}

/**
 * Hitung baris rekapitulasi nilai untuk seluruh mata pelajaran di dalam sesi
 */
export function calculateSessionRekap(
  session: AnalysisSession,
  students: Student[]
): {
  rows: SessionStudentRekapRow[];
  subjectAverages: Record<string, number>;
  totalClassAverage: number;
  totalPassedStudents: number;
  totalFailedStudents: number;
} {
  const rows: SessionStudentRekapRow[] = [];
  const subjectSums: Record<string, { total: number; count: number }> = {};

  session.subjects.forEach((subj) => {
    subjectSums[subj.subjectId] = { total: 0, count: 0 };
  });

  students.forEach((student) => {
    const grades: Record<string, number | null> = {};
    let studentSum = 0;
    let completedCount = 0;
    let passedCount = 0;
    let failedCount = 0;

    session.subjects.forEach((subj) => {
      const res = subj.studentResults[student.id];
      if (res && res.finalGrade !== undefined) {
        grades[subj.subjectId] = res.finalGrade;
        studentSum += res.finalGrade;
        completedCount++;

        if (res.finalGrade >= session.kktp) {
          passedCount++;
        } else {
          failedCount++;
        }

        subjectSums[subj.subjectId].total += res.finalGrade;
        subjectSums[subj.subjectId].count += 1;
      } else {
        grades[subj.subjectId] = null;
      }
    });

    const averageGrade =
      completedCount > 0 ? Math.round((studentSum / completedCount) * 100) / 100 : 0;
    const overallStatus: 'L' | 'TL' =
      averageGrade >= session.kktp && completedCount > 0 ? 'L' : 'TL';

    rows.push({
      studentId: student.id,
      studentName: student.name,
      grades,
      averageGrade,
      passedCount,
      failedCount,
      overallStatus,
    });
  });

  // Calculate subject averages
  const subjectAverages: Record<string, number> = {};
  let allSubjectsTotal = 0;
  let allSubjectsCount = 0;

  session.subjects.forEach((subj) => {
    const data = subjectSums[subj.subjectId];
    if (data && data.count > 0) {
      const avg = Math.round((data.total / data.count) * 100) / 100;
      subjectAverages[subj.subjectId] = avg;
      allSubjectsTotal += data.total;
      allSubjectsCount += data.count;
    } else {
      subjectAverages[subj.subjectId] = 0;
    }
  });

  const totalClassAverage =
    allSubjectsCount > 0
      ? Math.round((allSubjectsTotal / allSubjectsCount) * 100) / 100
      : 0;

  let totalPassedStudents = 0;
  let totalFailedStudents = 0;

  rows.forEach((r) => {
    if (r.overallStatus === 'L') {
      totalPassedStudents++;
    } else {
      totalFailedStudents++;
    }
  });

  return {
    rows,
    subjectAverages,
    totalClassAverage,
    totalPassedStudents,
    totalFailedStudents,
  };
}
