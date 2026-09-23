import React, { useState, useEffect } from 'react';
import {
  X,
  Award,
  AlertTriangle,
  Users,
  CreditCard,
  BookOpen,
  HeartPulse,
  Save,
  Trash2,
  Search,
  Plus,
  Check,
  Sparkles,
} from 'lucide-react';
import type { Student } from '../../services/studentStorage';

export interface StudentCriteria {
  // Peringkat & Prestasi
  isRank1To3?: boolean;
  isTop10?: boolean;
  isAchiever?: boolean;
  customRank?: number | null;

  // Hambatan & Perhatian Khusus
  hasLearningIssue?: boolean;
  hasFinancialIssue?: boolean;
  hasMedicalIssue?: boolean;
  needsSeparation?: boolean;
  separateFromStudentIds?: string[];

  // Catatan Khusus Guru
  notes?: string;
}

interface StudentCriteriaModalProps {
  isOpen: boolean;
  student: Student | null;
  allGradeStudents: Student[];
  initialCriteria?: StudentCriteria;
  onSave: (studentId: string, criteria: StudentCriteria) => void;
  onClose: () => void;
}

export const StudentCriteriaModal: React.FC<StudentCriteriaModalProps> = ({
  isOpen,
  student,
  allGradeStudents,
  initialCriteria,
  onSave,
  onClose,
}) => {
  const [criteria, setCriteria] = useState<StudentCriteria>({});
  const [separationSearch, setSeparationSearch] = useState('');
  const [isAddingSeparation, setIsAddingSeparation] = useState(false);

  useEffect(() => {
    if (student && initialCriteria) {
      setCriteria({ ...initialCriteria });
    } else {
      setCriteria({
        isRank1To3: false,
        isTop10: false,
        isAchiever: false,
        customRank: null,
        hasLearningIssue: false,
        hasFinancialIssue: false,
        hasMedicalIssue: false,
        needsSeparation: false,
        separateFromStudentIds: [],
        notes: '',
      });
    }
    setSeparationSearch('');
    setIsAddingSeparation(false);
  }, [student, initialCriteria, isOpen]);

  if (!isOpen || !student) return null;

  // Candidate students for separation (all in same grade except this student)
  const candidateStudents = allGradeStudents.filter((s) => {
    if (s.id === student.id) return false;
    const currentSeparated = criteria.separateFromStudentIds || [];
    if (currentSeparated.includes(s.id)) return false;
    if (!separationSearch.trim()) return true;
    return (
      s.name.toLowerCase().includes(separationSearch.toLowerCase()) ||
      s.classId.toLowerCase().includes(separationSearch.toLowerCase())
    );
  });

  const handleToggleRank1To3 = () => {
    setCriteria((prev) => ({ ...prev, isRank1To3: !prev.isRank1To3 }));
  };

  const handleToggleTop10 = () => {
    setCriteria((prev) => ({ ...prev, isTop10: !prev.isTop10 }));
  };

  const handleToggleAchiever = () => {
    setCriteria((prev) => ({ ...prev, isAchiever: !prev.isAchiever }));
  };

  const handleToggleLearningIssue = () => {
    setCriteria((prev) => ({ ...prev, hasLearningIssue: !prev.hasLearningIssue }));
  };

  const handleToggleFinancialIssue = () => {
    setCriteria((prev) => ({ ...prev, hasFinancialIssue: !prev.hasFinancialIssue }));
  };

  const handleToggleMedicalIssue = () => {
    setCriteria((prev) => ({ ...prev, hasMedicalIssue: !prev.hasMedicalIssue }));
  };

  const handleToggleSeparation = () => {
    setCriteria((prev) => {
      const nextVal = !prev.needsSeparation;
      return {
        ...prev,
        needsSeparation: nextVal,
        separateFromStudentIds: nextVal ? prev.separateFromStudentIds || [] : [],
      };
    });
  };

  const handleAddSeparatedStudent = (targetId: string) => {
    setCriteria((prev) => {
      const current = prev.separateFromStudentIds || [];
      if (current.includes(targetId)) return prev;
      return {
        ...prev,
        needsSeparation: true,
        separateFromStudentIds: [...current, targetId],
      };
    });
    setSeparationSearch('');
    setIsAddingSeparation(false);
  };

  const handleRemoveSeparatedStudent = (targetId: string) => {
    setCriteria((prev) => {
      const current = prev.separateFromStudentIds || [];
      const updated = current.filter((id) => id !== targetId);
      return {
        ...prev,
        separateFromStudentIds: updated,
        needsSeparation: updated.length > 0,
      };
    });
  };

  const handleSave = () => {
    onSave(student.id, criteria);
    onClose();
  };

  const handleReset = () => {
    const emptyCriteria: StudentCriteria = {
      isRank1To3: false,
      isTop10: false,
      isAchiever: false,
      customRank: null,
      hasLearningIssue: false,
      hasFinancialIssue: false,
      hasMedicalIssue: false,
      needsSeparation: false,
      separateFromStudentIds: [],
    };
    setCriteria(emptyCriteria);
    onSave(student.id, emptyCriteria);
    onClose();
  };

  const separatedStudentObjects = (criteria.separateFromStudentIds || [])
    .map((id) => allGradeStudents.find((s) => s.id === id))
    .filter(Boolean) as Student[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-gradient-to-b from-[#111628] to-[#0B0E1A] border border-indigo-500/30 rounded-3xl w-full max-w-lg shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[90vh] text-white">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-indigo-950/90 via-[#141A2E] to-purple-950/90 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/30 via-indigo-500/10 to-transparent border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
              <Sparkles className="w-5 h-5 drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-wide">{student.name}</h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60 shadow-xs">
                  Kelas {student.classId}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Atur parameter pemerataan prestasi, kendala SPP, dan hambatan</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4.5 custom-scrollbar text-xs">
          {/* SECTION 1: PRESTASI & PERINGKAT */}
          <div className="bg-[#14192B]/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-extrabold text-amber-400 text-xs tracking-wide">
                <Award className="w-4 h-4" />
                <span>Prestasi &amp; Peringkat Kelas</span>
              </div>
              <span className="text-[10px] text-amber-400/80 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Dibagi Berimbang
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleRank1To3}
                className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 border text-xs shadow-xs ${
                  criteria.isRank1To3
                    ? 'bg-gradient-to-r from-amber-500/25 to-amber-500/15 text-amber-300 border-amber-500/60 shadow-amber-500/15 ring-1 ring-amber-500/30'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span>🥇 Peringkat 1-3</span>
                {criteria.isRank1To3 && <Check className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />}
              </button>

              <button
                type="button"
                onClick={handleToggleTop10}
                className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 border text-xs shadow-xs ${
                  criteria.isTop10
                    ? 'bg-gradient-to-r from-purple-500/25 to-purple-500/15 text-purple-300 border-purple-500/60 shadow-purple-500/15 ring-1 ring-purple-500/30'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span>🌟 10 Besar</span>
                {criteria.isTop10 && <Check className="w-3.5 h-3.5 text-purple-400 stroke-[3]" />}
              </button>

              <button
                type="button"
                onClick={handleToggleAchiever}
                className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 border text-xs shadow-xs ${
                  criteria.isAchiever
                    ? 'bg-gradient-to-r from-emerald-500/25 to-emerald-500/15 text-emerald-300 border-emerald-500/60 shadow-emerald-500/15 ring-1 ring-emerald-500/30'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span>🎖️ Juara / Lomba</span>
                {criteria.isAchiever && <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />}
              </button>
            </div>

            {/* Optional Specific Rank Input */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
              <span className="text-[11px] text-slate-400 font-medium">Atau Peringkat Spesifik:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-xs font-bold">Ke -</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={criteria.customRank ?? ''}
                  onChange={(e) =>
                    setCriteria((prev) => ({
                      ...prev,
                      customRank: e.target.value ? parseInt(e.target.value, 10) : null,
                    }))
                  }
                  placeholder="1"
                  className="w-16 bg-[#0B0E17] border border-slate-700 focus:border-amber-400 rounded-xl px-2 py-1 text-center font-bold text-amber-300 text-xs outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: HAMBATAN & PERHATIAN KHUSUS (DIBAGI RATA SEMUA) */}
          <div className="bg-[#14192B]/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-extrabold text-rose-400 text-xs tracking-wide">
                <AlertTriangle className="w-4 h-4" />
                <span>Hambatan &amp; Perhatian Khusus</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Semua Dibagi Rata
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* KENDALA BIAYA SPP */}
              <button
                type="button"
                onClick={handleToggleFinancialIssue}
                className={`p-3 rounded-2xl font-bold transition-all cursor-pointer flex items-center justify-between border text-left text-xs shadow-xs ${
                  criteria.hasFinancialIssue
                    ? 'bg-gradient-to-r from-amber-500/25 to-amber-600/15 text-amber-300 border-amber-500/70 shadow-amber-500/15 ring-1 ring-amber-500/30'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${criteria.hasFinancialIssue ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
                    <CreditCard className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="block text-white font-bold">Kendala Biaya / SPP</span>
                    <span className="text-[10px] text-slate-400 font-normal">Tunggakan &amp; keringanan</span>
                  </div>
                </div>
                {criteria.hasFinancialIssue && <Check className="w-4 h-4 text-amber-400 stroke-[3]" />}
              </button>

              {/* HAMBATAN BELAJAR */}
              <button
                type="button"
                onClick={handleToggleLearningIssue}
                className={`p-3 rounded-2xl font-bold transition-all cursor-pointer flex items-center justify-between border text-left text-xs shadow-xs ${
                  criteria.hasLearningIssue
                    ? 'bg-gradient-to-r from-rose-500/25 to-rose-600/15 text-rose-300 border-rose-500/70 shadow-rose-500/15 ring-1 ring-rose-500/30'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${criteria.hasLearningIssue ? 'bg-rose-500 text-white font-black' : 'bg-slate-800 text-slate-400'}`}>
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="block text-white font-bold">Hambatan Belajar</span>
                    <span className="text-[10px] text-slate-400 font-normal">Bimbingan ekstra &amp; ABK</span>
                  </div>
                </div>
                {criteria.hasLearningIssue && <Check className="w-4 h-4 text-rose-400 stroke-[3]" />}
              </button>

              {/* PERHATIAN MEDIS */}
              <button
                type="button"
                onClick={handleToggleMedicalIssue}
                className={`p-3 rounded-2xl font-bold transition-all cursor-pointer flex items-center justify-between border text-left text-xs shadow-xs ${
                  criteria.hasMedicalIssue
                    ? 'bg-gradient-to-r from-cyan-500/25 to-cyan-600/15 text-cyan-300 border-cyan-500/70 shadow-cyan-500/15 ring-1 ring-cyan-500/30'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${criteria.hasMedicalIssue ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
                    <HeartPulse className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="block text-white font-bold">Perhatian Medis</span>
                    <span className="text-[10px] text-slate-400 font-normal">Kondisi fisik khusus</span>
                  </div>
                </div>
                {criteria.hasMedicalIssue && <Check className="w-4 h-4 text-cyan-400 stroke-[3]" />}
              </button>

              {/* PISAH ROMBEL */}
              <button
                type="button"
                onClick={handleToggleSeparation}
                className={`p-3 rounded-2xl font-bold transition-all cursor-pointer flex items-center justify-between border text-left text-xs shadow-xs ${
                  criteria.needsSeparation
                    ? 'bg-gradient-to-r from-indigo-500/25 to-indigo-600/15 text-indigo-300 border-indigo-500/70 shadow-indigo-500/15 ring-1 ring-indigo-500/30'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${criteria.needsSeparation ? 'bg-indigo-500 text-white font-black' : 'bg-slate-800 text-slate-400'}`}>
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="block text-white font-bold">Perlu Dipisah Rombel</span>
                    <span className="text-[10px] text-slate-400 font-normal">Tidak sekelas saat acak</span>
                  </div>
                </div>
                {criteria.needsSeparation && <Check className="w-4 h-4 text-indigo-400 stroke-[3]" />}
              </button>
            </div>

            {/* SEPARATION SELECTOR SUB-SECTION */}
            {criteria.needsSeparation && (
              <div className="mt-3 p-3.5 bg-[#0B0E17] border border-indigo-500/30 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Pisahkan dari siswa berikut (tidak boleh sekelas):
                  </span>
                  {!isAddingSeparation && (
                    <button
                      type="button"
                      onClick={() => setIsAddingSeparation(true)}
                      className="text-[10px] font-bold px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Pilih Siswa</span>
                    </button>
                  )}
                </div>

                {/* List of currently separated students */}
                <div className="flex flex-wrap gap-1.5">
                  {separatedStudentObjects.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic py-1">
                      Belum ada siswa yang dipilih untuk dipisahkan. Tekan &quot;+ Pilih Siswa&quot; di atas.
                    </p>
                  ) : (
                    separatedStudentObjects.map((sepSt) => (
                      <span
                        key={sepSt.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-xs font-semibold shadow-sm"
                      >
                        <span>{sepSt.name}</span>
                        <span className="text-[9px] text-indigo-400 font-bold">({sepSt.classId})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSeparatedStudent(sepSt.id)}
                          className="hover:text-rose-400 text-slate-400 ml-0.5 cursor-pointer"
                          title="Hapus pemisahan"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Dropdown / Search picker for adding student */}
                {isAddingSeparation && (
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={separationSearch}
                        onChange={(e) => setSeparationSearch(e.target.value)}
                        placeholder="Ketik nama siswa..."
                        autoFocus
                        className="w-full bg-[#14192B] border border-slate-700 text-white rounded-xl pl-8.5 pr-3 py-1.5 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="max-h-32 overflow-y-auto space-y-1 bg-[#14192B] border border-slate-800 rounded-xl p-1.5 custom-scrollbar">
                      {candidateStudents.length === 0 ? (
                        <p className="text-[10px] text-slate-500 p-2 text-center italic">Tidak ditemukan siswa</p>
                      ) : (
                        candidateStudents.slice(0, 8).map((cand) => (
                          <button
                            key={cand.id}
                            type="button"
                            onClick={() => handleAddSeparatedStudent(cand.id)}
                            className="w-full px-2.5 py-1.5 rounded-lg text-left hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-200 text-xs flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <span className="font-semibold truncate">{cand.name}</span>
                            <span className="text-[10px] text-slate-500 font-bold">Kelas {cand.classId}</span>
                          </button>
                        ))
                      )}
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingSeparation(false)}
                        className="text-[10px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                      >
                        Tutup Pencarian
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#0B0E17] border-t border-slate-800/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 bg-slate-800/60 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700/60 hover:border-rose-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Hapus semua tanda kriteria untuk siswa ini"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Kriteria</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Kriteria</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
