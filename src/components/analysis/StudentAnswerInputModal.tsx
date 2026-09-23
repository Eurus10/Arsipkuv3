import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Sparkles,
  User,
  Users,
  Award,
  BookOpen,
  RotateCcw,
  Check,
} from 'lucide-react';
import {
  AnalysisSubject,
  AnalysisSession,
  StudentAnswers,
} from '../../types/analysisTypes';
import { Student } from '../../services/studentStorage';
import {
  calculateMaxScore,
  calculateStudentTotalScore,
  createDefaultStudentAnswers,
} from '../../services/analysis/analysisCalculationService';
import { useModalNavigation } from '../../utils/modalNavigation';

interface StudentAnswerInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: AnalysisSession;
  subject: AnalysisSubject;
  students: Student[];
  initialStudentIndex?: number;
  onSaveStudentResult: (
    subjectId: string,
    result: {
      studentId: string;
      studentName: string;
      answers: StudentAnswers;
    }
  ) => void;
}

export const StudentAnswerInputModal: React.FC<StudentAnswerInputModalProps> = ({
  isOpen,
  onClose,
  session,
  subject,
  students,
  initialStudentIndex = 0,
  onSaveStudentResult,
}) => {
  const [currentIdx, setCurrentIdx] = useState<number>(initialStudentIndex);
  const [answers, setAnswers] = useState<StudentAnswers>(() =>
    createDefaultStudentAnswers(subject.config)
  );

  // Intercept hardware and browser back button on phone so modal closes gracefully without leaving the web
  useModalNavigation('student-answer-input', isOpen, onClose);

  // Sort students alphabetically
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) =>
      a.name.localeCompare(b.name, 'id', { sensitivity: 'base' })
    );
  }, [students]);

  const currentStudent = sortedStudents[currentIdx] || sortedStudents[0];
  const config = subject.config;
  const maxScore = calculateMaxScore(config);

  // Load existing student answers whenever currentIdx or subject changes
  useEffect(() => {
    if (!currentStudent) return;
    const existingResult = subject.studentResults[currentStudent.id];
    if (existingResult && existingResult.answers) {
      setAnswers({
        pg: [...existingResult.answers.pg],
        isian: [...existingResult.answers.isian],
        c: [...existingResult.answers.c],
      });
    } else {
      // Create default answers (all 1s / full score)
      setAnswers(createDefaultStudentAnswers(config));
    }
  }, [currentIdx, currentStudent, subject, config]);

  if (!isOpen || !currentStudent) return null;

  // Real-time calculations (pembulatan ke bilangan bulat terdekat)
  const totalScore = calculateStudentTotalScore(answers, config);
  const finalGrade = Math.round((totalScore / maxScore) * 100);
  const isPassed = finalGrade >= session.kktp;

  // Toggle PG answer: 1 -> 0 -> 1
  const handleTogglePg = (qIndex: number) => {
    const updated = [...answers.pg];
    updated[qIndex] = updated[qIndex] === 1 ? 0 : 1;
    const newAnswers = { ...answers, pg: updated };
    setAnswers(newAnswers);
    // Instant autosave
    onSaveStudentResult(subject.subjectId, {
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      answers: newAnswers,
    });
  };

  // Toggle Isian answer
  const handleToggleIsian = (qIndex: number, value?: number) => {
    const updated = [...answers.isian];
    if (value !== undefined) {
      updated[qIndex] = value;
    } else {
      updated[qIndex] = updated[qIndex] >= 1 ? 0 : config.isianWeight;
    }
    const newAnswers = { ...answers, isian: updated };
    setAnswers(newAnswers);
    onSaveStudentResult(subject.subjectId, {
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      answers: newAnswers,
    });
  };

  // Change Bagian C score
  const handleSetScoreC = (qIndex: number, score: number) => {
    const updated = [...answers.c];
    updated[qIndex] = score;
    const newAnswers = { ...answers, c: updated };
    setAnswers(newAnswers);
    onSaveStudentResult(subject.subjectId, {
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      answers: newAnswers,
    });
  };

  // Set all PG correct or incorrect
  const handleSetAllPg = (value: number) => {
    const updated = new Array(config.pgCount).fill(value);
    const newAnswers = { ...answers, pg: updated };
    setAnswers(newAnswers);
    onSaveStudentResult(subject.subjectId, {
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      answers: newAnswers,
    });
  };

const handleNextStudent = () => {
  // Pastikan data siswa yang sedang aktif benar-benar
  // disimpan ketika tombol "Simpan & Siswa Berikutnya"
  // ditekan.
  if (currentStudent) {
    onSaveStudentResult(subject.subjectId, {
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      answers: {
        pg: [...answers.pg],
        isian: [...answers.isian],
        c: [...answers.c],
      },
    });
  }

  // Setelah disimpan, pindah ke siswa berikutnya.
  if (currentIdx < sortedStudents.length - 1) {
    setCurrentIdx(currentIdx + 1);
  } else {
    onClose();
  }
};

  const handlePrevStudent = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  // Count how many students are completed in this subject
  const completedCount = Object.keys(subject.studentResults).length;

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-slate-950/95 sm:items-center sm:justify-center sm:p-4 sm:bg-slate-950/80 backdrop-blur-md animate-[fadeIn_150ms_ease-out]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-4xl flex flex-col bg-slate-900 border-0 sm:border sm:border-white/10 rounded-none sm:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden text-slate-100">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/4 w-72 h-20 bg-sky-500/10 blur-3xl pointer-events-none -z-10" />

        {/* ====================================================
            TOP HEADER BAR (Safe-area protected & Compact on Mobile)
            ==================================================== */}
        <div className="px-3 sm:px-6 py-2 sm:py-3.5 pt-[max(0.625rem,env(safe-area-inset-top))] bg-slate-950/60 backdrop-blur-md border-b border-white/10 flex items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-sky-500/15 border border-sky-400/25 flex items-center justify-center text-sky-400 flex-shrink-0 shadow-[0_0_12px_rgba(56,189,248,0.15)]">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[11px] sm:text-xs uppercase tracking-wider text-sky-400 font-bold truncate">
                  {subject.subjectName}
                </span>
                <span className="text-[10px] bg-white/10 text-slate-300 border border-white/10 px-1.5 sm:px-2 py-0.5 rounded-full font-bold shrink-0">
                  Kelas {session.className}
                </span>
              </div>
              <h3 className="text-xs sm:text-base font-black text-white truncate">
                Input Nilai ({completedCount}/{sortedStudents.length} Selesai)
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
            title="Tutup (Esc / Back)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ====================================================
            STUDENT SELECTOR & NAVIGATION (Single-row Compact on Mobile)
            ==================================================== */}
        <div className="px-3 sm:px-6 py-2 sm:py-2.5 bg-slate-950/40 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/30 flex items-center justify-center font-black text-xs shrink-0">
              {currentIdx + 1}
            </div>
            <div className="min-w-0 flex-1">
              <select
                value={currentIdx}
                onChange={(e) => setCurrentIdx(Number(e.target.value))}
                className="w-full bg-slate-900 text-xs sm:text-sm font-bold text-white hover:text-sky-300 outline-none cursor-pointer border-b border-dashed border-slate-600 focus:border-sky-400 py-0.5 truncate"
              >
                {sortedStudents.map((s, idx) => {
                  const isGraded = !!subject.studentResults[s.id];
                  return (
                    <option key={s.id} value={idx} className="bg-slate-900 text-white">
                      {idx + 1}. {s.name} {isGraded ? '✓' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Quick Nav Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handlePrevStudent}
              disabled={currentIdx === 0}
              className={`min-h-[32px] sm:min-h-[36px] px-2 sm:px-3 py-1 rounded-lg sm:rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                currentIdx === 0
                  ? 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 cursor-pointer'
              }`}
              title="Siswa Sebelumnya"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Sebelumnya</span>
            </button>

            <button
              type="button"
              onClick={handleNextStudent}
              className="min-h-[32px] sm:min-h-[36px] px-2.5 sm:px-3.5 py-1 rounded-lg sm:rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-sky-200 text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
              title="Siswa Berikutnya"
            >
              <span className="hidden xs:inline">Berikutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ====================================================
            SCROLLABLE QUESTION GRADING CANVAS
            ==================================================== */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 space-y-4 sm:space-y-6 overscroll-contain">
          {/* 1. BAGIAN A: PILIHAN GANDA (PG) */}
          {config.pgCount > 0 && (
            <div className="bg-slate-950/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5 pb-2.5 border-b border-white/10">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-sky-500/15 text-sky-300 border border-sky-500/30 rounded-md text-[11px] font-black">
                      Bagian A
                    </span>
                    <span>Pilihan Ganda ({config.pgCount} Soal &times; Bobot {config.pgWeight})</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Klik nomor soal untuk menandai Benar (Hijau ✓) atau Salah (Merah ✗).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetAllPg(1)}
                    className="flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[10.5px] font-bold transition-all cursor-pointer"
                  >
                    Semua Benar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllPg(0)}
                    className="flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[10.5px] font-bold transition-all cursor-pointer"
                  >
                    Semua Salah
                  </button>
                </div>
              </div>

              {/* Grid Buttons (Touch friendly min height on mobile) */}
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 sm:gap-2.5">
                {Array.from({ length: config.pgCount }).map((_, i) => {
                  const isCorrect = (answers.pg[i] ?? 1) === 1;
                  return (
                    <button
                      key={`pg-${i}`}
                      type="button"
                      onClick={() => handleTogglePg(i)}
                      className={`relative flex flex-col items-center justify-center min-h-[50px] p-2 rounded-xl border transition-all cursor-pointer ${
                        isCorrect
                          ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                          : 'bg-rose-500/15 border-rose-500/35 text-rose-300 hover:bg-rose-500/25 shadow-[0_0_10px_rgba(244,63,94,0.1)]'
                      }`}
                    >
                      <span className="text-[10px] text-slate-400 font-semibold mb-0.5">
                        #{i + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        {isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        )}
                        <span className="text-xs font-black tabular-nums">
                          {isCorrect ? config.pgWeight : 0}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. BAGIAN B: ISIAN SINGKAT */}
          {config.isianCount > 0 && (
            <div className="bg-slate-950/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="mb-3.5 pb-2.5 border-b border-white/10">
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-md text-[11px] font-black">
                    Bagian B
                  </span>
                  <span>Isian Singkat ({config.isianCount} Soal &times; Bobot {config.isianWeight})</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Klik nomor soal untuk mengubah skor jawaban isian siswa.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {Array.from({ length: config.isianCount }).map((_, i) => {
                  const currentVal = answers.isian[i] ?? 1;
                  const isCorrect = currentVal >= 1;
                  return (
                    <div
                      key={`isian-${i}`}
                      className="p-3 rounded-xl bg-slate-900/60 border border-white/10 flex flex-col justify-between gap-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">Isian #{i + 1}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                            isCorrect
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          Skor: {currentVal}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleToggleIsian(i, 0)}
                          className={`flex-1 min-h-[32px] py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentVal === 0
                              ? 'bg-rose-500/30 border border-rose-400/40 text-rose-200'
                              : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          0
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleIsian(i, config.isianWeight)}
                          className={`flex-1 min-h-[32px] py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentVal >= 1
                              ? 'bg-emerald-500/30 border border-emerald-400/40 text-emerald-200'
                              : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          {config.isianWeight}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. BAGIAN C: URAIAN / ESSAY / MENJODOHKAN */}
          {config.cCount > 0 && (
            <div className="bg-slate-950/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="mb-3.5 pb-2.5 border-b border-white/10">
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-purple-500/15 text-purple-300 border border-purple-500/30 rounded-md text-[11px] font-black">
                    Bagian C
                  </span>
                  <span>
                    {config.cType || 'Uraian'} ({config.cCount} Soal &times; Maks. Bobot {config.cWeight})
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pilih perolehan skor siswa untuk setiap butir soal bagian C.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {Array.from({ length: config.cCount }).map((_, i) => {
                  const currentScore = answers.c[i] !== undefined ? answers.c[i] : config.cWeight;
                  return (
                    <div
                      key={`c-${i}`}
                      className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">
                          {config.cType || 'Soal'} #{i + 1}
                        </span>
                        <span className="text-xs font-black text-purple-300 tabular-nums">
                          {currentScore} / {config.cWeight} Poin
                        </span>
                      </div>

                      {/* Score Options */}
                      <div className="grid grid-flow-col auto-cols-fr gap-1.5">
                        {Array.from({ length: config.cWeight + 1 }).map((__, scoreVal) => {
                          const isSelected = currentScore === scoreVal;
                          return (
                            <button
                              key={`c-score-${i}-${scoreVal}`}
                              type="button"
                              onClick={() => handleSetScoreC(i, scoreVal)}
                              className={`min-h-[34px] py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-500/35 border border-purple-400/40 text-purple-200 shadow-sm'
                                  : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white'
                              }`}
                            >
                              {scoreVal}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ====================================================
            FOOTER SUMMARY BAR & NEXT ACTION (SAFE-AREA & MOBILE OPTIMIZED)
            ==================================================== */}
        <div className="flex-shrink-0 px-3 sm:px-6 py-2.5 sm:py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-slate-950/95 sm:bg-slate-950/80 backdrop-blur-md border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-6 bg-slate-900/60 sm:bg-transparent px-3 py-1.5 sm:p-0 rounded-xl border border-white/5 sm:border-0">
            <div>
              <span className="text-[9px] sm:text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
                Total Skor
              </span>
              <span className="text-xs sm:text-base font-black text-white tabular-nums">
                {totalScore} <span className="text-[10px] sm:text-xs text-slate-500 font-normal">/ {maxScore}</span>
              </span>
            </div>

            <div className="h-5 sm:h-6 w-px bg-white/10" />

            <div>
              <span className="text-[9px] sm:text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
                Nilai Akhir
              </span>
              <span className="text-sm sm:text-xl font-black text-sky-300 tabular-nums">
                {finalGrade}
              </span>
            </div>

            <div className="h-5 sm:h-6 w-px bg-white/10" />

            <div>
              <span className="text-[9px] sm:text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
                Keterangan
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase border ${
                  isPassed
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}
              >
                {isPassed ? 'Lulus (L)' : 'Remidi (TL)'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto min-h-[42px] sm:min-h-[38px] px-3 sm:px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center text-center"
              title="Tutup lembar input (Kembali ke modul analisis)"
            >
              Selesai & Tutup
            </button>

            <button
              type="button"
              onClick={handleNextStudent}
              className="w-full sm:w-auto min-h-[42px] sm:min-h-[38px] px-3.5 sm:px-5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs tracking-wide flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(56,189,248,0.25)] transition-all cursor-pointer text-center"
              title="Simpan nilai dan lanjutkan ke siswa berikutnya"
            >
              <span className="truncate">
                {currentIdx < sortedStudents.length - 1
                  ? 'Simpan & Lanjut'
                  : 'Simpan & Selesai'}
              </span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
