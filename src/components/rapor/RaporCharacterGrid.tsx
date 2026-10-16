import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Search,
  User,
  Users,
  Save,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import {
  CharacterDescriptor,
  CharacterPredicate,
  StudentCharacterRecord,
  StudentCharacterScore,
  DEFAULT_CHARACTER_DESCRIPTORS,
  RaporStsClassData,
} from '../../types/raporSts';
import { Student } from '../../services/studentStorage';

interface RaporCharacterGridProps {
  classData: RaporStsClassData;
  students: Student[];
  descriptors?: CharacterDescriptor[];
  characterRecords: Record<string, StudentCharacterRecord>;
  onUpdateCharacterRecords: (records: Record<string, StudentCharacterRecord>) => void;
  onSaveCharacterRecords?: () => Promise<void>;
  isSaving?: boolean;
}

const PREDICATE_LABELS: Record<CharacterPredicate, string> = {
  A: 'Sangat Baik',
  B: 'Baik',
  C: 'Cukup',
  D: 'Perlu Bimbingan',
};

export const RaporCharacterGrid: React.FC<RaporCharacterGridProps> = ({
  classData,
  students,
  descriptors,
  characterRecords,
  onUpdateCharacterRecords,
  onSaveCharacterRecords,
  isSaving = false,
}) => {
  const activeDescriptors = useMemo(() => {
    return descriptors && descriptors.length > 0
      ? descriptors
      : classData.customCharacterDescriptors && classData.customCharacterDescriptors.length > 0
      ? classData.customCharacterDescriptors
      : DEFAULT_CHARACTER_DESCRIPTORS;
  }, [descriptors, classData.customCharacterDescriptors]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [bulkModalPredicate, setBulkModalPredicate] = useState<CharacterPredicate | null>(null);

  // Sync selectedStudentId if empty
  React.useEffect(() => {
    if (!selectedStudentId && students.length > 0) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.nim && s.nim.toLowerCase().includes(q)) ||
        (s.nisn && s.nisn.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  const currentStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || students[0];
  }, [students, selectedStudentId]);

  const currentRecord: StudentCharacterRecord = useMemo(() => {
    if (!currentStudent) {
      return { studentId: '', characterScores: {} };
    }
    return (
      characterRecords[currentStudent.id] || {
        studentId: currentStudent.id,
        characterScores: {},
        teacherNote: '',
      }
    );
  }, [characterRecords, currentStudent]);

  // Current student completed count
  const completedCount = useMemo(() => {
    if (!currentRecord) return 0;
    return activeDescriptors.filter(
      (desc) => !!currentRecord.characterScores[desc.id]?.predicate
    ).length;
  }, [currentRecord, activeDescriptors]);

  // Handle changing a predicate for a specific character
  const handleSelectPredicate = (
    desc: CharacterDescriptor,
    predicate: CharacterPredicate
  ) => {
    if (!currentStudent) return;

    const existingScore = currentRecord.characterScores[desc.id];
    const defaultText = desc.indicators[predicate] || '';

    // If teacher hasn't typed a custom text, use default for this predicate
    const newDescription =
      existingScore?.customized && existingScore.description
        ? existingScore.description
        : defaultText;

    const updatedCharacterScores: Record<string, StudentCharacterScore> = {
      ...currentRecord.characterScores,
      [desc.id]: {
        predicate,
        description: newDescription,
        customized: existingScore?.customized || false,
      },
    };

    const updatedRecords: Record<string, StudentCharacterRecord> = {
      ...characterRecords,
      [currentStudent.id]: {
        ...currentRecord,
        studentId: currentStudent.id,
        characterScores: updatedCharacterScores,
      },
    };

    onUpdateCharacterRecords(updatedRecords);
  };

  // Handle manual typing in description
  const handleDescriptionChange = (descId: string, text: string) => {
    if (!currentStudent) return;

    const existingScore = currentRecord.characterScores[descId];
    const updatedCharacterScores: Record<string, StudentCharacterScore> = {
      ...currentRecord.characterScores,
      [descId]: {
        predicate: existingScore?.predicate || 'B',
        description: text,
        customized: true,
      },
    };

    const updatedRecords: Record<string, StudentCharacterRecord> = {
      ...characterRecords,
      [currentStudent.id]: {
        ...currentRecord,
        studentId: currentStudent.id,
        characterScores: updatedCharacterScores,
      },
    };

    onUpdateCharacterRecords(updatedRecords);
  };

  // Reset description back to default template
  const handleResetDescription = (desc: CharacterDescriptor) => {
    if (!currentStudent) return;

    const currentScore = currentRecord.characterScores[desc.id];
    const currentPred = currentScore?.predicate || 'B';
    const defaultText = desc.indicators[currentPred] || '';

    const updatedCharacterScores: Record<string, StudentCharacterScore> = {
      ...currentRecord.characterScores,
      [desc.id]: {
        predicate: currentPred,
        description: defaultText,
        customized: false,
      },
    };

    const updatedRecords: Record<string, StudentCharacterRecord> = {
      ...characterRecords,
      [currentStudent.id]: {
        ...currentRecord,
        characterScores: updatedCharacterScores,
      },
    };

    onUpdateCharacterRecords(updatedRecords);
  };

  // Handle overall teacher note
  const handleTeacherNoteChange = (note: string) => {
    if (!currentStudent) return;

    const updatedRecords: Record<string, StudentCharacterRecord> = {
      ...characterRecords,
      [currentStudent.id]: {
        ...currentRecord,
        teacherNote: note,
      },
    };

    onUpdateCharacterRecords(updatedRecords);
  };

  // Quick Action 1: Set All 18 Characters for Current Student to selected Predicate (A/B/C/D)
  const handleSetCurrentStudentPredicate = (predicate: CharacterPredicate) => {
    if (!currentStudent) return;

    const updatedCharacterScores: Record<string, StudentCharacterScore> = {
      ...currentRecord.characterScores,
    };

    activeDescriptors.forEach((desc) => {
      updatedCharacterScores[desc.id] = {
        predicate,
        description: desc.indicators[predicate] || '',
        customized: false,
      };
    });

    const updatedRecords: Record<string, StudentCharacterRecord> = {
      ...characterRecords,
      [currentStudent.id]: {
        ...currentRecord,
        studentId: currentStudent.id,
        characterScores: updatedCharacterScores,
      },
    };

    onUpdateCharacterRecords(updatedRecords);
    setNotification(
      `Semua 18 karakter untuk ${currentStudent.name} diatur ke Predikat ${predicate} (${PREDICATE_LABELS[predicate]}).`
    );
    setTimeout(() => setNotification(null), 3000);
  };

  // Quick Action 2: Apply selected Predicate (A/B/C/D) to Entire Class
  const handleConfirmApplyClassPredicate = (predicate: CharacterPredicate) => {
    const updatedRecords: Record<string, StudentCharacterRecord> = {
      ...characterRecords,
    };

    students.forEach((st) => {
      const existing = updatedRecords[st.id] || {
        studentId: st.id,
        characterScores: {},
        teacherNote: '',
      };

      const newScores: Record<string, StudentCharacterScore> = {
        ...existing.characterScores,
      };

      activeDescriptors.forEach((desc) => {
        newScores[desc.id] = {
          predicate,
          description: desc.indicators[predicate] || '',
          customized: false,
        };
      });

      updatedRecords[st.id] = {
        ...existing,
        studentId: st.id,
        characterScores: newScores,
      };
    });

    onUpdateCharacterRecords(updatedRecords);
    setBulkModalPredicate(null);
    setNotification(
      `Berhasil mengatur Predikat ${predicate} (${PREDICATE_LABELS[predicate]}) untuk seluruh siswa se-kelas!`
    );
    setTimeout(() => setNotification(null), 3500);
  };

  // Next / Previous student navigation
  const currentIndex = students.findIndex((s) => s.id === currentStudent?.id);
  const handlePrevStudent = () => {
    if (currentIndex > 0) {
      setSelectedStudentId(students[currentIndex - 1].id);
    }
  };
  const handleNextStudent = () => {
    if (currentIndex < students.length - 1) {
      setSelectedStudentId(students[currentIndex + 1].id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Action Bar with A/B/C/D Quick Dropdowns */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Penilaian 18 Karakter Peserta Didik</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                Lembar 2 Rapor
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih predikat A, B, C, atau D pada setiap aspek. Narasi deskripsi terisi otomatis dan dapat diedit langsung.
            </p>
          </div>
        </div>

        {/* Quick Toolbar: Dropdowns for Student & Class + Save Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dropdown 1: Set Siswa Ini */}
          <div className="relative">
            <select
              defaultValue=""
              onChange={(e) => {
                const val = e.target.value as CharacterPredicate;
                if (val) {
                  handleSetCurrentStudentPredicate(val);
                  e.target.value = '';
                }
              }}
              disabled={!currentStudent}
              className="px-3 py-2 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-semibold focus:outline-none cursor-pointer disabled:opacity-50 appearance-none pr-7 transition-all"
              title="Set semua 18 karakter siswa ini ke predikat pilihan"
            >
              <option value="" disabled className="bg-white text-slate-400">
                ⚡ Set Siswa Ini (A/B/C/D)...
              </option>
              <option value="A" className="bg-white text-slate-900">
                Set Siswa Ini: A (Sangat Baik)
              </option>
              <option value="B" className="bg-white text-slate-900">
                Set Siswa Ini: B (Baik)
              </option>
              <option value="C" className="bg-white text-slate-900">
                Set Siswa Ini: C (Cukup)
              </option>
              <option value="D" className="bg-white text-slate-900">
                Set Siswa Ini: D (Perlu Bimbingan)
              </option>
            </select>
            <Zap className="w-3.5 h-3.5 text-sky-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Dropdown 2: Set Seluruh Kelas */}
          <div className="relative">
            <select
              defaultValue=""
              onChange={(e) => {
                const val = e.target.value as CharacterPredicate;
                if (val) {
                  setBulkModalPredicate(val);
                  e.target.value = '';
                }
              }}
              className="px-3 py-2 rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold focus:outline-none cursor-pointer appearance-none pr-7 transition-all"
              title="Set seluruh siswa se-kelas ke predikat pilihan"
            >
              <option value="" disabled className="bg-white text-slate-400">
                👥 Set Se-Kelas (A/B/C/D)...
              </option>
              <option value="A" className="bg-white text-slate-900">
                Set Se-Kelas: A (Sangat Baik)
              </option>
              <option value="B" className="bg-white text-slate-900">
                Set Se-Kelas: B (Baik)
              </option>
              <option value="C" className="bg-white text-slate-900">
                Set Se-Kelas: C (Cukup)
              </option>
              <option value="D" className="bg-white text-slate-900">
                Set Se-Kelas: D (Perlu Bimbingan)
              </option>
            </select>
            <Users className="w-3.5 h-3.5 text-purple-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Save Button */}
          {onSaveCharacterRecords && (
            <button
              type="button"
              onClick={onSaveCharacterRecords}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Karakter'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace: Left Sidebar (Student List) + Right Content (18 Character Rows) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: Student Selector */}
        <div className="lg:col-span-4 xl:col-span-3 rounded-2xl bg-white border border-slate-200/90 p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>Daftar Siswa ({students.length})</span>
            </h3>
            <span className="text-[11px] font-normal text-slate-500">
              Kelas {classData.config.classLevel}
            </span>
          </div>

          {/* Search Student Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* Student List */}
          <div className="space-y-1.5 max-h-[580px] overflow-y-auto custom-scrollbar pr-1">
            {filteredStudents.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                Tidak ada siswa yang cocok.
              </p>
            ) : (
              filteredStudents.map((st, idx) => {
                const isSelected = st.id === currentStudent?.id;
                const rec = characterRecords[st.id];
                const filled = rec
                  ? activeDescriptors.filter(
                      (d) => !!rec.characterScores[d.id]?.predicate
                    ).length
                  : 0;
                const isComplete = filled === activeDescriptors.length;

                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedStudentId(st.id)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-2 border cursor-pointer ${
                      isSelected
                        ? 'bg-purple-50 border-purple-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <span
                        className={`w-5 text-[11px] font-bold text-center shrink-0 ${
                          isSelected ? 'text-purple-700' : 'text-slate-400'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isSelected ? 'text-slate-900 font-bold' : 'text-slate-700'
                          }`}
                        >
                          {st.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          NIS: {st.nim || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          isComplete
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : filled > 0
                            ? 'bg-amber-50 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {filled}/{activeDescriptors.length}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 18 Character Rows in Compact Format */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {/* Student Header & Quick Switcher */}
          {currentStudent && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900">
                    {currentStudent.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
                    NIS: {currentStudent.nim || '-'} | NISN: {currentStudent.nisn || '-'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Status Penilaian: <strong className="text-emerald-700 font-semibold">{completedCount} dari {activeDescriptors.length}</strong> karakter terisi
                </p>
              </div>

              {/* Prev / Next buttons */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handlePrevStudent}
                  disabled={currentIndex <= 0}
                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 disabled:opacity-30 cursor-pointer transition-colors"
                  title="Siswa Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-slate-700 px-2">
                  {currentIndex + 1} / {students.length}
                </span>
                <button
                  type="button"
                  onClick={handleNextStudent}
                  disabled={currentIndex >= students.length - 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 disabled:opacity-30 cursor-pointer transition-colors"
                  title="Siswa Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Compact 18 Character Rows (1. Religius | A B C D | deskripsi manual) */}
          <div className="space-y-2">
            {activeDescriptors.map((desc, idx) => {
              const scoreItem = currentRecord.characterScores[desc.id];
              const selectedPred = scoreItem?.predicate || null;
              const descText = scoreItem?.description || '';
              const isCustomized = !!scoreItem?.customized;

              return (
                <div
                  key={desc.id}
                  className="flex flex-col md:flex-row md:items-center gap-2.5 p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-xs"
                >
                  {/* Part 1: Number & Character Name (e.g. 1. Religius) */}
                  <div className="flex items-center gap-2 md:w-52 lg:w-56 shrink-0">
                    <span className="w-5 h-5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate" title={desc.name}>
                      {desc.name}
                    </span>
                  </div>

                  {/* Part 2: Predicate Chips [A] [B] [C] [D] */}
                  <div className="flex items-center gap-1 shrink-0">
                    {(['A', 'B', 'C', 'D'] as CharacterPredicate[]).map((p) => {
                      const isChosen = selectedPred === p;
                      const colorClasses = {
                        A: isChosen
                          ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-xs'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
                        B: isChosen
                          ? 'bg-sky-600 text-white font-bold border-sky-600 shadow-xs'
                          : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100',
                        C: isChosen
                          ? 'bg-amber-500 text-white font-bold border-amber-500 shadow-xs'
                          : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
                        D: isChosen
                          ? 'bg-rose-600 text-white font-bold border-rose-600 shadow-xs'
                          : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100',
                      };

                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleSelectPredicate(desc, p)}
                          className={`w-7 h-7 sm:w-8 sm:h-7 rounded-lg text-xs border transition-all flex items-center justify-center cursor-pointer ${colorClasses[p]}`}
                          title={`${p} — ${PREDICATE_LABELS[p]}`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  {/* Part 3: Manual / Auto Description Input */}
                  <div className="flex-1 min-w-0 relative flex items-center gap-1.5">
                    <input
                      type="text"
                      value={descText}
                      onChange={(e) =>
                        handleDescriptionChange(desc.id, e.target.value)
                      }
                      placeholder={
                        selectedPred
                          ? desc.indicators[selectedPred] || 'Tulis deskripsi...'
                          : 'Pilih A/B/C/D atau ketik deskripsi manual...'
                      }
                      className={`w-full h-8 px-3 rounded-lg border text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${
                        isCustomized
                          ? 'border-amber-400 bg-amber-50/40 focus:border-amber-500'
                          : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-400'
                      }`}
                      title={descText}
                    />

                    {isCustomized && (
                      <button
                        type="button"
                        onClick={() => handleResetDescription(desc)}
                        className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-cyan-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Kembalikan narasi ke indikator baku"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Catatan Khusus Wali Kelas untuk Lembar Karakter */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 space-y-2 shadow-xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Catatan Perkembangan Karakter Wali Kelas (Opsional)</span>
            </h4>
            <textarea
              rows={3}
              value={currentRecord.teacherNote || ''}
              onChange={(e) => handleTeacherNoteChange(e.target.value)}
              placeholder="Contoh: Ananda menunjukkan pembiasaan ibadah dan sikap disiplin yang sangat membanggakan di kelas..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white custom-scrollbar resize-none leading-relaxed transition-all"
            />
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Applying Selected Predicate to entire class */}
      {bulkModalPredicate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                Terapkan Predikat {bulkModalPredicate} ({PREDICATE_LABELS[bulkModalPredicate]}) Se-Kelas?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tindakan ini akan mengatur seluruh 18 aspek karakter untuk <strong>{students.length} siswa</strong> dengan Predikat <strong>{bulkModalPredicate} ({PREDICATE_LABELS[bulkModalPredicate]})</strong> beserta narasi capaian indikator baku otomatis.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBulkModalPredicate(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleConfirmApplyClassPredicate(bulkModalPredicate)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                Ya, Terapkan ke Seluruh Kelas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
