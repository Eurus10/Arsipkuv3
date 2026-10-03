import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Check,
  Search,
  User,
  Users,
  Save,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
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
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);

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

  // Quick Action 1: Set All 18 Characters for Current Student to 'B' (Baik)
  const handleSetCurrentStudentDefaultB = () => {
    if (!currentStudent) return;

    const updatedCharacterScores: Record<string, StudentCharacterScore> = {
      ...currentRecord.characterScores,
    };

    activeDescriptors.forEach((desc) => {
      updatedCharacterScores[desc.id] = {
        predicate: 'B',
        description: desc.indicators['B'] || '',
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
      `Semua 18 karakter untuk ${currentStudent.name} berhasil diatur ke Predikat B (Baik).`
    );
    setTimeout(() => setNotification(null), 3000);
  };

  // Quick Action 2: Apply 'B' to Entire Class
  const handleConfirmApplyClassDefaultB = () => {
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
        // If not already filled, or set default
        if (!newScores[desc.id] || !newScores[desc.id].predicate) {
          newScores[desc.id] = {
            predicate: 'B',
            description: desc.indicators['B'] || '',
            customized: false,
          };
        }
      });

      updatedRecords[st.id] = {
        ...existing,
        studentId: st.id,
        characterScores: newScores,
      };
    });

    onUpdateCharacterRecords(updatedRecords);
    setShowBulkConfirmModal(false);
    setNotification(
      `Berhasil menerapkan Predikat B (Baik) default untuk seluruh siswa se-kelas!`
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

      {/* Top Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-[#07111E] border border-white/[0.08] shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Penilaian 18 Karakter Peserta Didik</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30">
                Lembar 2 Rapor
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Pilih predikat A, B, C, atau D. Deskripsi capaian terisi otomatis dan dapat disesuaikan manual.
            </p>
          </div>
        </div>

        {/* Quick Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSetCurrentStudentDefaultB}
            disabled={!currentStudent}
            className="px-3 py-2 rounded-xl border border-sky-400/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Set semua 18 karakter siswa ini ke B (Baik)"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Set Siswa Ini: B (Baik)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBulkConfirmModal(true)}
            className="px-3 py-2 rounded-xl border border-purple-400/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Terapkan default B ke seluruh siswa yang belum diisi"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Set Default Se-Kelas (B)</span>
          </button>

          {onSaveCharacterRecords && (
            <button
              type="button"
              onClick={onSaveCharacterRecords}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-400/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Karakter'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace: Left Sidebar (Student List) + Right Content (18 Character Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: Student Selector */}
        <div className="lg:col-span-4 xl:col-span-3 rounded-2xl bg-[#07111E] border border-white/[0.08] p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Daftar Siswa ({students.length})</span>
            </h3>
            <span className="text-[11px] font-normal text-slate-400">
              Kelas {classData.config.classLevel}
            </span>
          </div>

          {/* Search Student Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-white/[0.08] bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/40"
            />
          </div>

          {/* Student List */}
          <div className="space-y-1.5 max-h-[580px] overflow-y-auto custom-scrollbar pr-1">
            {filteredStudents.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
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
                        ? 'bg-purple-500/20 border-purple-400/50 shadow-md shadow-purple-500/10'
                        : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] text-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <span
                        className={`w-5 text-[11px] font-bold text-center shrink-0 ${
                          isSelected ? 'text-purple-300' : 'text-slate-500'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isSelected ? 'text-white' : 'text-slate-200'
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
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                            : filled > 0
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                            : 'bg-slate-800 text-slate-500'
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

        {/* RIGHT COLUMN: 18 Character Cards for Current Student */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {/* Student Header & Quick Switcher */}
          {currentStudent && (
            <div className="p-4 rounded-2xl bg-[#07111E] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base font-bold text-white">
                    {currentStudent.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.1] text-slate-300 text-xs">
                    NIS: {currentStudent.nim || '-'} | NISN: {currentStudent.nisn || '-'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Status Kelengkapan: <strong className="text-emerald-400 font-semibold">{completedCount} dari {activeDescriptors.length}</strong> karakter dinilai
                </p>
              </div>

              {/* Prev / Next buttons */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handlePrevStudent}
                  disabled={currentIndex <= 0}
                  className="p-1.5 rounded-lg border border-white/[0.08] bg-slate-900 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Siswa Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-slate-300 px-2">
                  {currentIndex + 1} / {students.length}
                </span>
                <button
                  type="button"
                  onClick={handleNextStudent}
                  disabled={currentIndex >= students.length - 1}
                  className="p-1.5 rounded-lg border border-white/[0.08] bg-slate-900 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Siswa Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 18 Character Cards Grid */}
          <div className="space-y-3">
            {activeDescriptors.map((desc, idx) => {
              const scoreItem = currentRecord.characterScores[desc.id];
              const selectedPred = scoreItem?.predicate || null;
              const descText = scoreItem?.description || '';
              const isCustomized = !!scoreItem?.customized;

              return (
                <div
                  key={desc.id}
                  className="p-4 rounded-2xl bg-[#07111E] border border-white/[0.08] hover:border-white/[0.15] transition-all space-y-3 shadow-lg"
                >
                  {/* Top: Number, Character Name, Predicate Selection Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/[0.1] text-xs font-bold text-slate-300 flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-white tracking-wide">
                        {desc.name}
                      </h4>
                    </div>

                    {/* Predicate Selector Chips: A, B, C, D */}
                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      {(['A', 'B', 'C', 'D'] as CharacterPredicate[]).map((p) => {
                        const isChosen = selectedPred === p;
                        const labelMap = {
                          A: 'Sangat Baik',
                          B: 'Baik',
                          C: 'Cukup',
                          D: 'Perlu Bimbingan',
                        };

                        const colorClasses = {
                          A: isChosen
                            ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md shadow-emerald-500/20'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-400/25 hover:bg-emerald-500/20',
                          B: isChosen
                            ? 'bg-sky-500 text-slate-950 font-bold border-sky-400 shadow-md shadow-sky-500/20'
                            : 'bg-sky-500/10 text-sky-300 border-sky-400/25 hover:bg-sky-500/20',
                          C: isChosen
                            ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                            : 'bg-amber-500/10 text-amber-300 border-amber-400/25 hover:bg-amber-500/20',
                          D: isChosen
                            ? 'bg-rose-500 text-white font-bold border-rose-400 shadow-md shadow-rose-500/20'
                            : 'bg-rose-500/10 text-rose-300 border-rose-400/25 hover:bg-rose-500/20',
                        };

                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handleSelectPredicate(desc, p)}
                            className={`px-3 py-1 rounded-lg text-xs border transition-all flex items-center gap-1 cursor-pointer ${colorClasses[p]}`}
                            title={`${p} — ${labelMap[p]}`}
                          >
                            <span className="font-extrabold">{p}</span>
                            <span className="text-[11px] hidden sm:inline">
                              {labelMap[p]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom: Description Textarea (Editable & Auto-generated) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <span>Deskripsi Capaian Perkembangan</span>
                        {isCustomized && (
                          <span className="text-amber-400 font-medium">
                            (Disesuaikan Manual)
                          </span>
                        )}
                      </span>

                      {isCustomized && (
                        <button
                          type="button"
                          onClick={() => handleResetDescription(desc)}
                          className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                          title="Kembalikan ke narasi indikator bawaan"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset Narasi Baku</span>
                        </button>
                      )}
                    </div>

                    <textarea
                      rows={2}
                      value={descText}
                      onChange={(e) =>
                        handleDescriptionChange(desc.id, e.target.value)
                      }
                      placeholder={
                        selectedPred
                          ? desc.indicators[selectedPred] || 'Tulis deskripsi capaian...'
                          : 'Pilih predikat A/B/C/D di atas untuk mengisi deskripsi otomatis...'
                      }
                      className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-slate-950/70 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-400/40 focus:ring-1 focus:ring-purple-400/20 leading-relaxed custom-scrollbar resize-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Catatan Khusus Wali Kelas untuk Lembar Karakter */}
          <div className="p-4 rounded-2xl bg-[#07111E] border border-white/[0.08] space-y-2 shadow-xl">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Catatan Perkembangan Karakter Wali Kelas (Opsional)</span>
            </h4>
            <textarea
              rows={3}
              value={currentRecord.teacherNote || ''}
              onChange={(e) => handleTeacherNoteChange(e.target.value)}
              placeholder="Contoh: Ananda menunjukkan pembiasaan ibadah dan sikap disiplin yang sangat membanggakan di kelas..."
              className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-slate-950/70 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400/40 custom-scrollbar resize-none leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Applying Default B to entire class */}
      {showBulkConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0B1525] border border-white/[0.1] p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-white">
                Terapkan Default B (Baik) Se-Kelas?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tindakan ini akan mengisi seluruh 18 karakter untuk <strong>{students.length} siswa</strong> dengan Predikat <strong>B (Baik)</strong> dan narasi otomatis. Karakter yang sudah Anda beri nilai lain sebelumnya tidak akan terhapus.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkConfirmModal(false)}
                className="px-4 py-2 rounded-xl border border-white/[0.1] text-xs font-semibold text-slate-300 hover:bg-white/[0.05] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmApplyClassDefaultB}
                className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold shadow-lg shadow-purple-500/25 cursor-pointer"
              >
                Ya, Terapkan ke Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
