import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Copy,
  Check,
  Search,
  ClipboardList,
  Pin,
  Sparkles,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import {
  type Student,
  subscribeToStudents,
  DEFAULT_SCHOOL_NAME,
  cleanNisn,
} from '../services/studentStorage';

interface PbsCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolsList?: string[];
}

const LOCAL_TEACHER_KEY = 'pbs_manual_teacher_name';

export const PbsCopyModal: React.FC<PbsCopyModalProps> = ({
  isOpen,
  onClose,
  schoolsList = [DEFAULT_SCHOOL_NAME],
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Manual Teacher Input
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [manualTeacherName, setManualTeacherName] = useState<string>(
    () => localStorage.getItem(LOCAL_TEACHER_KEY) || ''
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Copy Feedback & Persistent Checked Items state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedNameIds, setCopiedNameIds] = useState<Set<string>>(new Set());
  const [copiedNisnIds, setCopiedNisnIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);

    const unsubStudents = subscribeToStudents(
      (data) => {
        setStudents(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('Failed to load students for PBS:', err);
        setIsLoading(false);
      }
    );

    return () => {
      unsubStudents();
    };
  }, [isOpen]);

  // Handle Manual Teacher Name change with localStorage persistence
  const handleTeacherNameChange = (val: string) => {
    setManualTeacherName(val);
    try {
      localStorage.setItem(LOCAL_TEACHER_KEY, val);
    } catch (e) {
      console.error('Failed to save teacher name to local storage', e);
    }
  };

  // Available classes derived from students list
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.classId) set.add(s.classId.toUpperCase());
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const studentSchool = (student.schoolName || DEFAULT_SCHOOL_NAME).trim().toLowerCase();
      const matchSchool = !selectedSchool || studentSchool === selectedSchool.trim().toLowerCase();

      const matchClass =
        !selectedClass || student.classId.trim().toUpperCase() === selectedClass.trim().toUpperCase();

      const q = searchQuery.trim().toLowerCase();
      const validNisn = cleanNisn(student.nisn) || '';
      const matchQuery =
        !q ||
        student.name.toLowerCase().includes(q) ||
        validNisn.toLowerCase().includes(q) ||
        student.classId.toLowerCase().includes(q);

      return matchSchool && matchClass && matchQuery;
    });
  }, [students, selectedSchool, selectedClass, searchQuery]);

  const handleCopyText = (text: string, key: string, studentId?: string, type?: 'name' | 'nisn') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);

    if (studentId) {
      if (type === 'name') {
        setCopiedNameIds((prev) => new Set(prev).add(studentId));
      } else if (type === 'nisn') {
        setCopiedNisnIds((prev) => new Set(prev).add(studentId));
      }
    }

    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleCopyAllStudentsPbs = () => {
    if (filteredStudents.length === 0) return;
    const lines = filteredStudents.map((s) => {
      const nisnVal = cleanNisn(s.nisn) || '-';
      return `${s.name}\t${nisnVal}`;
    });
    const ids = filteredStudents.map((s) => s.id);
    setCopiedNameIds((prev) => new Set([...prev, ...ids]));
    setCopiedNisnIds((prev) => new Set([...prev, ...ids]));
    handleCopyText(lines.join('\n'), 'all-students-pbs');
  };

  const handleCopyAllStudentNames = () => {
    if (filteredStudents.length === 0) return;
    const lines = filteredStudents.map((s) => s.name);
    const ids = filteredStudents.map((s) => s.id);
    setCopiedNameIds((prev) => new Set([...prev, ...ids]));
    handleCopyText(lines.join('\n'), 'all-students-names');
  };

  const handleCopyAllStudentNisns = () => {
    if (filteredStudents.length === 0) return;
    const lines = filteredStudents.map((s) => cleanNisn(s.nisn) || '-');
    const ids = filteredStudents.map((s) => s.id);
    setCopiedNisnIds((prev) => new Set([...prev, ...ids]));
    handleCopyText(lines.join('\n'), 'all-students-nisns');
  };

  const handleResetMarks = () => {
    setCopiedNameIds(new Set());
    setCopiedNisnIds(new Set());
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl h-[92vh] flex flex-col rounded-[24px] sm:rounded-[28px] bg-[#121622] border border-cyan-500/30 shadow-2xl text-slate-100 overflow-hidden animate-scale-up">
        {/* 1. MODAL TOP HEADER */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[#242C40] bg-gradient-to-r from-cyan-950/50 via-[#161B29] to-[#121622] flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/35 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-md">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white tracking-tight font-heading">
                  Salin Data untuk Aplikasi PBS
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Quick Copy
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Nama Guru & Kelas terkunci di bagian atas (sticky). Gulir ke bawah untuk menyalin nama siswa & NISN.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. STICKY TOP CONTROL PANEL (Nama Guru Manual, Kelas, Sekolah, Tombol Salin Guru) */}
        <div className="sticky top-0 z-20 bg-[#161B28] border-b border-cyan-500/30 p-3 sm:p-4 shadow-xl flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-[#242D42] pb-2.5">
            <div className="flex items-center gap-2">
              <Pin className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="text-xs font-black text-cyan-300 uppercase tracking-wider">
                Panel Sticky Utama (Guru & Kelas)
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {(copiedNameIds.size > 0 || copiedNisnIds.size > 0) && (
                <button
                  type="button"
                  onClick={handleResetMarks}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[11px] font-bold border border-rose-500/30 flex items-center gap-1 transition-all cursor-pointer mr-1"
                  title="Bersihkan tanda centang yang sudah disalin"
                >
                  <RotateCcw className="w-3 h-3 text-rose-400" />
                  <span>Reset Tanda ({copiedNameIds.size})</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopyAllStudentNames}
                disabled={filteredStudents.length === 0}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                title="Salin seluruh kolom nama siswa yang tampil"
              >
                {copiedKey === 'all-students-names' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-cyan-400" />
                )}
                <span>{copiedKey === 'all-students-names' ? 'Tersalin' : 'Salin Semua Nama'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyAllStudentNisns}
                disabled={filteredStudents.length === 0}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                title="Salin seluruh kolom NISN yang tampil"
              >
                {copiedKey === 'all-students-nisns' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-cyan-400" />
                )}
                <span>{copiedKey === 'all-students-nisns' ? 'Tersalin' : 'Salin Semua NISN'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyAllStudentsPbs}
                disabled={filteredStudents.length === 0}
                className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold shadow-md shadow-cyan-600/20 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                title="Salin Nama + NISN format tabulasi Excel"
              >
                {copiedKey === 'all-students-pbs' ? (
                  <Check className="w-3 h-3 text-white" />
                ) : (
                  <Sparkles className="w-3 h-3 text-white" />
                )}
                <span>{copiedKey === 'all-students-pbs' ? 'Tersalin!' : 'Format Tabulasi (Nama+NISN)'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3 items-end">
            {/* School Filter (col-span-3) */}
            <div className="sm:col-span-3">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                Sekolah
              </label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full bg-[#0F121C] border border-[#2B354D] rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-bold focus:outline-none focus:border-cyan-400"
              >
                <option value="">Semua Sekolah ({schoolsList.length})</option>
                {schoolsList.map((sch) => (
                  <option key={sch} value={sch}>
                    {sch}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Filter (col-span-2) */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                Kelas
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full bg-[#0F121C] border border-[#2B354D] rounded-xl px-2.5 py-1.5 text-xs text-cyan-300 font-extrabold focus:outline-none focus:border-cyan-400"
              >
                <option value="">Semua Kelas</option>
                {availableClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    Kelas {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* MANUAL Teacher Name Input & Sticky Copy Button (col-span-5) */}
            <div className="sm:col-span-5">
              <label className="block text-[10px] font-extrabold text-amber-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Nama Guru / Wali Kelas (Ketik Manual)</span>
                <span className="text-[9px] text-slate-400 font-normal">Tersimpan otomatis</span>
              </label>

              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={manualTeacherName}
                    onChange={(e) => handleTeacherNameChange(e.target.value)}
                    placeholder="Ketik nama guru di sini..."
                    className="w-full bg-[#0F121C] border border-amber-500/50 text-amber-200 placeholder-amber-500/40 font-extrabold rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* STICKY COPY TEACHER NAME BUTTON */}
                <button
                  type="button"
                  onClick={() => handleCopyText(manualTeacherName, 'teacher-sticky')}
                  disabled={!manualTeacherName.trim()}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0 shadow-md ${
                    copiedKey === 'teacher-sticky'
                      ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                      : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                  title="Salin Nama Guru ini untuk di-paste ke PBS"
                >
                  {copiedKey === 'teacher-sticky' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-slate-950" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-950" />
                      <span>Salin Nama Guru</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Search Student (col-span-2) */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                Filter Nama
              </label>
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari siswa..."
                  className="w-full bg-[#0F121C] border border-[#2B354D] rounded-xl pl-7 pr-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 font-medium focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. SCROLLABLE STUDENTS CONTENT TABLE */}
        <div className="p-3 sm:p-5 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-xs">Memuat data peserta didik...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-16 text-center bg-[#161B28] rounded-2xl border border-[#262D42] text-slate-400 text-xs">
              Tidak ada data siswa yang cocok dengan pilihan kelas/sekolah ini.
            </div>
          ) : (
            <div className="rounded-2xl border border-[#242C40] bg-[#0F121C] overflow-hidden">
              <div className="px-4 py-2.5 bg-[#161B28] border-b border-[#242C40] flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Daftar Peserta Didik ({filteredStudents.length} siswa)
                </span>
                <span className="text-[11px] text-slate-400 italic">
                  Gunakan tombol di sebelah kanan tiap kolom untuk menyalin
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-200">
                  <thead className="bg-[#141824] text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-[#242C40]">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-4">Nama Siswa (Aksi Salin)</th>
                      <th className="py-2.5 px-4">NISN (Aksi Salin)</th>
                      <th className="py-2.5 px-3 text-center">Kelas</th>
                      <th className="py-2.5 px-3">Sekolah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1D2436]">
                    {filteredStudents.map((student, idx) => {
                      const nameKey = `student-name-${student.id}`;
                      const nisnKey = `student-nisn-${student.id}`;
                      const displayNisn = cleanNisn(student.nisn);
                      const isNameCopied = copiedNameIds.has(student.id);
                      const isNisnCopied = copiedNisnIds.has(student.id);

                      return (
                        <tr
                          key={student.id}
                          className={`transition-colors ${
                            isNameCopied || isNisnCopied
                              ? 'bg-emerald-950/20 hover:bg-emerald-950/30'
                              : 'hover:bg-[#161C2C]'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                            {isNameCopied ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                            ) : (
                              idx + 1
                            )}
                          </td>

                          {/* STUDENT NAME WITH COPY BUTTON & CHECKMARK INDICATOR */}
                          <td className="py-2.5 px-4 font-bold text-white">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`truncate ${isNameCopied ? 'text-emerald-200' : 'text-white'}`}>
                                  {student.name}
                                </span>
                                {isNameCopied && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>Sudah Disalin</span>
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleCopyText(student.name, nameKey, student.id, 'name')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer flex-shrink-0 ${
                                  copiedKey === nameKey || isNameCopied
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                    : 'bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40'
                                }`}
                                title="Salin nama siswa ini"
                              >
                                {copiedKey === nameKey || isNameCopied ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>Tersalin</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-cyan-400" />
                                    <span>Salin Nama</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>

                          {/* NISN WITH COPY BUTTON & CHECKMARK INDICATOR */}
                          <td className="py-2.5 px-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`font-mono font-bold ${
                                    isNisnCopied
                                      ? 'text-emerald-300'
                                      : displayNisn
                                      ? 'text-cyan-300'
                                      : 'text-slate-600'
                                  }`}
                                >
                                  {displayNisn || '-'}
                                </span>
                                {isNisnCopied && (
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                )}
                              </div>

                              {displayNisn ? (
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(displayNisn, nisnKey, student.id, 'nisn')}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer flex-shrink-0 ${
                                    copiedKey === nisnKey || isNisnCopied
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                      : 'bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40'
                                  }`}
                                  title="Salin NISN siswa ini"
                                >
                                  {copiedKey === nisnKey || isNisnCopied ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span>Tersalin</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3 text-cyan-400" />
                                      <span>Salin NISN</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-600 italic">Belum ada NISN</span>
                              )}
                            </div>
                          </td>

                          {/* CLASS */}
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 font-black text-[11px]">
                              {student.classId}
                            </span>
                          </td>

                          {/* SCHOOL */}
                          <td className="py-2.5 px-3 text-slate-400 text-[11px] truncate max-w-[140px]">
                            {student.schoolName || DEFAULT_SCHOOL_NAME}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 4. MODAL FOOTER */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-[#242C40] bg-[#121622] flex items-center justify-between gap-3 flex-shrink-0">
          <p className="text-[11px] text-slate-400">
            * Data yang disalin dapat langsung ditempel (*paste*) pada bidang entri aplikasi PBS atau Excel.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
