import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Settings2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
} from 'lucide-react';
import { MasterClass, MasterSubject } from '../../data/masterExamData';
import {
  AnalysisQuestionConfig,
  AnalysisSubject,
} from '../../types/analysisTypes';
import { calculateMaxScore } from '../../services/analysis/analysisCalculationService';
import { PillStepper } from './PillStepper';
import { useModalNavigation } from '../../utils/modalNavigation';

interface SubjectConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeClass: MasterClass | null;
  defaultTeacherName?: string;
  existingSubject?: AnalysisSubject | null;
  onSave: (data: {
    subjectId: string;
    subjectName: string;
    teacherName?: string;
    config: AnalysisQuestionConfig;
  }) => void;
}

export const SubjectConfigModal: React.FC<SubjectConfigModalProps> = ({
  isOpen,
  onClose,
  activeClass,
  defaultTeacherName,
  existingSubject,
  onSave,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [customSubjectName, setCustomSubjectName] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string>('');

  // Config States (Default resmi: 25 PG, 10 Isian, 5 Uraian)
  const [pgCount, setPgCount] = useState<number>(25);
  const [pgWeight, setPgWeight] = useState<number>(1);

  const [isianCount, setIsianCount] = useState<number>(10);
  const [isianWeight, setIsianWeight] = useState<number>(1);

  const [cType, setCType] = useState<'Uraian' | 'Essay' | 'Menjodohkan' | 'Lainnya'>('Uraian');
  const [cCount, setCCount] = useState<number>(5);
  const [cWeight, setCWeight] = useState<number>(2);

  // Intercept phone back button so modal closes gracefully without leaving web
  useModalNavigation('subject-config', isOpen, onClose);

  // Initialize form when opening
  useEffect(() => {
    if (existingSubject) {
      setSelectedSubjectId(existingSubject.subjectId);
      setCustomSubjectName(existingSubject.subjectName);
      setTeacherName(existingSubject.teacherName || defaultTeacherName || '');
      setPgCount(existingSubject.config.pgCount);
      setPgWeight(existingSubject.config.pgWeight);
      setIsianCount(existingSubject.config.isianCount);
      setIsianWeight(existingSubject.config.isianWeight);
      setCType(existingSubject.config.cType || 'Uraian');
      setCCount(existingSubject.config.cCount);
      setCWeight(existingSubject.config.cWeight);
    } else if (activeClass && activeClass.subjects && activeClass.subjects.length > 0) {
      const first = activeClass.subjects[0];
      setSelectedSubjectId(first.id);
      setCustomSubjectName(first.name);
      setTeacherName(defaultTeacherName || first.teacher || activeClass.waliKelas || '');
      setPgCount(25);
      setPgWeight(1);
      setIsianCount(10);
      setIsianWeight(1);
      setCType('Uraian');
      setCCount(5);
      setCWeight(2);
    } else {
      setTeacherName(defaultTeacherName || '');
      setPgCount(25);
      setIsianCount(10);
      setCCount(5);
    }
  }, [existingSubject, activeClass, defaultTeacherName, isOpen]);

  if (!isOpen) return null;

  const currentConfig: AnalysisQuestionConfig = {
    pgCount: Number(pgCount) || 0,
    pgWeight: Number(pgWeight) || 1,
    isianCount: Number(isianCount) || 0,
    isianWeight: Number(isianWeight) || 1,
    cType,
    cCount: Number(cCount) || 0,
    cWeight: Number(cWeight) || 2,
  };

  const calculatedMaxScore = calculateMaxScore(currentConfig);
  const totalQuestions =
    currentConfig.pgCount + currentConfig.isianCount + currentConfig.cCount;

  const handleSubjectSelect = (subjId: string) => {
    setSelectedSubjectId(subjId);
    if (subjId === 'CUSTOM') {
      setCustomSubjectName('');
    } else if (activeClass) {
      const found = activeClass.subjects.find((s) => s.id === subjId);
      if (found) {
        setCustomSubjectName(found.name);
        if (!teacherName) {
          setTeacherName(defaultTeacherName || found.teacher || activeClass.waliKelas || '');
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalQuestions === 0) {
      alert('Jumlah soal tidak boleh kosong (minimal harus ada 1 butir soal).');
      return;
    }

    const finalSubjectId =
      selectedSubjectId === 'CUSTOM'
        ? `custom_${Date.now()}`
        : selectedSubjectId || `subj_${Date.now()}`;
    const finalSubjectName =
      customSubjectName.trim() ||
      (activeClass?.subjects.find((s) => s.id === selectedSubjectId)?.name ?? 'Mata Pelajaran');

    onSave({
      subjectId: finalSubjectId,
      subjectName: finalSubjectName,
      teacherName: teacherName.trim() || defaultTeacherName || '',
      config: currentConfig,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-slate-900/60 sm:items-center sm:justify-center sm:p-4 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-xl h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-white border-0 sm:border sm:border-slate-200/90 rounded-none sm:rounded-3xl shadow-2xl text-slate-800 overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:pb-4 border-b border-slate-200/80 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-600 shadow-xs shrink-0">
              <Settings2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight">
                {existingSubject ? 'Konfigurasi Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Tentukan mata pelajaran dan komposisi butir soal ujian
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-4 sm:space-y-5 overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-white">
          {/* Pilih Mapel Master */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Mata Pelajaran
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => handleSubjectSelect(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-sm sm:text-base text-slate-800 font-medium outline-none transition-all cursor-pointer"
            >
              {activeClass?.subjects.map((subj) => (
                <option key={subj.id} value={subj.id} className="bg-white text-slate-800">
                  {subj.name} {subj.teacher ? `(Guru: ${subj.teacher})` : ''}
                </option>
              ))}
              <option value="CUSTOM" className="bg-white text-slate-800">+ Tambah Mapel Lain (Kustom)</option>
            </select>
          </div>

          {/* Input nama mapel kustom jika dipilih */}
          {selectedSubjectId === 'CUSTOM' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Mata Pelajaran Kustom
              </label>
              <input
                type="text"
                value={customSubjectName}
                onChange={(e) => setCustomSubjectName(e.target.value)}
                placeholder="Contoh: Bahasa Sunda / Tahfidz"
                className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 font-medium outline-none transition-all"
                required
              />
            </div>
          )}

          {/* Konfigurasi Butir Soal Grid */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-sky-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Komposisi &amp; Bobot Butir Soal
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* 1. Pilihan Ganda */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-800">1. Pilihan Ganda</span>
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-100 border border-sky-200 px-2 py-0.5 rounded-md">
                      PG
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Jumlah Soal PG
                    </label>
                    <PillStepper
                      value={pgCount}
                      onChange={setPgCount}
                      min={0}
                      max={100}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Bobot per Nomor
                    </label>
                    <PillStepper
                      value={pgWeight}
                      onChange={setPgWeight}
                      min={1}
                      max={20}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Isian Singkat */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-800">2. Isian Singkat</span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md">
                      IS
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Jumlah Soal Isian
                    </label>
                    <PillStepper
                      value={isianCount}
                      onChange={setIsianCount}
                      min={0}
                      max={100}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Bobot per Nomor
                    </label>
                    <PillStepper
                      value={isianWeight}
                      onChange={setIsianWeight}
                      min={1}
                      max={20}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Bagian C / Uraian / Menjodohkan */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800">3. Bagian C</span>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md">
                      {cType}
                    </span>
                  </div>

                  {/* Dropdown Ditaruh di Bawah Teks Bagian C */}
                  <div className="mb-3">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      Tipe / Jenis Bagian C
                    </label>
                    <select
                      value={cType}
                      onChange={(e) => setCType(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none cursor-pointer transition-colors"
                    >
                      <option value="Uraian" className="bg-white text-slate-800">Uraian</option>
                      <option value="Essay" className="bg-white text-slate-800">Essay</option>
                      <option value="Menjodohkan" className="bg-white text-slate-800">Menjodohkan</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Jumlah Soal {cType}
                    </label>
                    <PillStepper
                      value={cCount}
                      onChange={setCCount}
                      min={0}
                      max={100}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Bobot Maks. per Soal
                    </label>
                    <PillStepper
                      value={cWeight}
                      onChange={setCWeight}
                      min={1}
                      max={50}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ringkasan Perhitungan Skor Maksimal */}
          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-sky-800 font-bold">
                Total Butir Soal: <span className="text-slate-900">{totalQuestions} Nomor</span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Rumus Nilai: (Total Skor Diperoleh / {calculatedMaxScore}) &times; 100
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block font-semibold">Skor Maksimal</span>
              <span className="text-2xl font-black text-sky-700 tabular-nums">
                {calculatedMaxScore}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all shadow-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs tracking-wide flex items-center justify-center gap-2 shadow-sm active:scale-98 cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-4 h-4 text-sky-100" />
              <span>Simpan Konfigurasi Mapel</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
