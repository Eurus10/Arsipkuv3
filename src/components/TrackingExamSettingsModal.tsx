import React, { useState, useEffect } from 'react';
import {
  X,
  SlidersHorizontal,
  GraduationCap,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  Check,
  BookOpen,
  UserCheck,
  Sparkles,
  AlertCircle,
  FolderPlus,
} from 'lucide-react';
import { MasterClass, MasterSubject, MASTER_CLASSES } from '../data/masterExamData';
import { ExamSessionConfig } from '../types';
import {
  getStoredMasterClasses,
  updateStoredMasterClasses,
  getStoredSchoolYears,
  addStoredSchoolYear,
  deleteStoredSchoolYear,
} from '../services/storage';

interface TrackingExamSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  examSession: ExamSessionConfig;
  onSaveSession: (updated: ExamSessionConfig) => Promise<void>;
  schoolYears: string[];
  masterClasses?: MasterClass[];
  onUpdateMasterClasses?: (classes: MasterClass[]) => Promise<void>;
}

export const TrackingExamSettingsModal: React.FC<TrackingExamSettingsModalProps> = ({
  isOpen,
  onClose,
  examSession,
  onSaveSession,
  schoolYears: initialSchoolYears,
  masterClasses: propMasterClasses,
  onUpdateMasterClasses,
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'session' | 'master' | 'years'>('session');

  // Master Classes State
  const [currentMasterClasses, setCurrentMasterClasses] = useState<MasterClass[]>(() => {
    return propMasterClasses && propMasterClasses.length > 0
      ? propMasterClasses
      : getStoredMasterClasses();
  });

  // School Years State
  const [currentSchoolYears, setCurrentSchoolYears] = useState<string[]>(() => {
    return getStoredSchoolYears();
  });
  const [newYearInput, setNewYearInput] = useState<string>('');
  const [yearError, setYearError] = useState<string | null>(null);

  // Exam Session Configuration State
  const [sessionName, setSessionName] = useState<string>(examSession.name);
  const [schoolYear, setSchoolYear] = useState<string>(examSession.schoolYear);

  const [activeClasses, setActiveClasses] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    const classes = propMasterClasses || getStoredMasterClasses();
    classes.forEach((c) => {
      map[c.id] = examSession.activeClasses?.[c.id] ?? true;
    });
    return map;
  });

  const [activeSubjects, setActiveSubjects] = useState<Record<string, Record<string, boolean>>>(
    () => {
      const map: Record<string, Record<string, boolean>> = {};
      const classes = propMasterClasses || getStoredMasterClasses();
      classes.forEach((c) => {
        map[c.id] = {};
        c.subjects.forEach((s) => {
          map[c.id][s.id] = examSession.activeSubjects?.[c.id]?.[s.id] ?? true;
        });
      });
      return map;
    }
  );

  // Tab selections
  const [selectedClassTab, setSelectedClassTab] = useState<string>('1A');
  const [masterSelectedClassId, setMasterSelectedClassId] = useState<string>('1A');

  // Master Edit state
  const [editingWaliKelas, setEditingWaliKelas] = useState<string>('');
  const [isEditingWali, setIsEditingWali] = useState<boolean>(false);

  // Subject Add/Edit in Master
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editSubjectName, setEditSubjectName] = useState<string>('');
  const [editSubjectTeacher, setEditSubjectTeacher] = useState<string>('');

  const [isAddingSubject, setIsAddingSubject] = useState<boolean>(false);
  const [newSubjectName, setNewSubjectName] = useState<string>('');
  const [newSubjectTeacher, setNewSubjectTeacher] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    if (propMasterClasses && propMasterClasses.length > 0) {
      setCurrentMasterClasses(propMasterClasses);
    }
  }, [propMasterClasses]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Selected master class
  const selectedMasterClass =
    currentMasterClasses.find((c) => c.id === masterSelectedClassId) ||
    currentMasterClasses[0] ||
    MASTER_CLASSES[0];

  // Calculate live dynamic target for Session Tab
  let calculatedTarget = 0;
  let totalActiveClasses = 0;
  currentMasterClasses.forEach((c) => {
    if (activeClasses[c.id]) {
      totalActiveClasses++;
      c.subjects.forEach((s) => {
        if (activeSubjects[c.id]?.[s.id] !== false) {
          calculatedTarget++;
        }
      });
    }
  });

  // --- SESSION TAB HANDLERS ---
  const handleToggleClass = (classId: string) => {
    setActiveClasses((prev) => ({
      ...prev,
      [classId]: !prev[classId],
    }));
  };

  const handleToggleSubject = (classId: string, subjectId: string) => {
    setActiveSubjects((prev) => ({
      ...prev,
      [classId]: {
        ...prev[classId],
        [subjectId]: prev[classId]?.[subjectId] === false ? true : false,
      },
    }));
  };

  const handleSetAllSubjectsForClass = (classId: string, value: boolean) => {
    const targetClass = currentMasterClasses.find((c) => c.id === classId);
    if (!targetClass) return;

    setActiveSubjects((prev) => {
      const classMap = { ...(prev[classId] || {}) };
      targetClass.subjects.forEach((s) => {
        classMap[s.id] = value;
      });
      return {
        ...prev,
        [classId]: classMap,
      };
    });
  };

  const handleSetAllClasses = (value: boolean) => {
    const newMap: Record<string, boolean> = {};
    currentMasterClasses.forEach((c) => {
      newMap[c.id] = value;
    });
    setActiveClasses(newMap);
  };

  const handleResetSessionToDefault = () => {
    const classMap: Record<string, boolean> = {};
    const subMap: Record<string, Record<string, boolean>> = {};
    currentMasterClasses.forEach((c) => {
      classMap[c.id] = true;
      subMap[c.id] = {};
      c.subjects.forEach((s) => {
        subMap[c.id][s.id] = true;
      });
    });
    setActiveClasses(classMap);
    setActiveSubjects(subMap);
    showNotification('Pengaturan kelas & mapel ujian direset ke semua aktif.');
  };

  // --- MASTER CLASS HANDLERS ---
  const handleSaveWaliKelas = async () => {
    if (!editingWaliKelas.trim()) return;
    const updated = currentMasterClasses.map((c) => {
      if (c.id === masterSelectedClassId) {
        return { ...c, waliKelas: editingWaliKelas.trim() };
      }
      return c;
    });
    setCurrentMasterClasses(updated);
    await updateStoredMasterClasses(updated);
    if (onUpdateMasterClasses) await onUpdateMasterClasses(updated);
    setIsEditingWali(false);
    showNotification(`Wali Kelas ${selectedMasterClass.name} diubah menjadi "${editingWaliKelas.trim()}".`);
  };

  const handleStartEditSubject = (sub: MasterSubject) => {
    setEditingSubjectId(sub.id);
    setEditSubjectName(sub.name);
    setEditSubjectTeacher(sub.teacher || '');
  };

  const handleSaveEditSubject = async (subjectId: string) => {
    if (!editSubjectName.trim()) return;

    const updated = currentMasterClasses.map((c) => {
      if (c.id === masterSelectedClassId) {
        const updatedSubs = c.subjects.map((s) => {
          if (s.id === subjectId) {
            return {
              ...s,
              name: editSubjectName.trim().toUpperCase(),
              teacher: editSubjectTeacher.trim() || undefined,
            };
          }
          return s;
        });
        return { ...c, subjects: updatedSubs };
      }
      return c;
    });

    setCurrentMasterClasses(updated);
    await updateStoredMasterClasses(updated);
    if (onUpdateMasterClasses) await onUpdateMasterClasses(updated);
    setEditingSubjectId(null);
    showNotification(`Mata pelajaran diperbarui.`);
  };

  const handleAddNewSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    const newSubId = `${masterSelectedClassId.toLowerCase()}-${Date.now().toString(36)}`;
    const newSub: MasterSubject = {
      id: newSubId,
      name: newSubjectName.trim().toUpperCase(),
      teacher: newSubjectTeacher.trim() || undefined,
      order: selectedMasterClass.subjects.length + 1,
    };

    const updated = currentMasterClasses.map((c) => {
      if (c.id === masterSelectedClassId) {
        return { ...c, subjects: [...c.subjects, newSub] };
      }
      return c;
    });

    setCurrentMasterClasses(updated);
    await updateStoredMasterClasses(updated);
    if (onUpdateMasterClasses) await onUpdateMasterClasses(updated);

    // Also automatically enable it in the active subjects map
    setActiveSubjects((prev) => ({
      ...prev,
      [masterSelectedClassId]: {
        ...(prev[masterSelectedClassId] || {}),
        [newSubId]: true,
      },
    }));

    setNewSubjectName('');
    setNewSubjectTeacher('');
    setIsAddingSubject(false);
    showNotification(`Mapel "${newSub.name}" berhasil ditambahkan ke Kelas ${selectedMasterClass.name}.`);
  };

  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    if (!window.confirm(`Hapus mata pelajaran "${subjectName}" dari Kelas ${selectedMasterClass.name}?`)) {
      return;
    }

    const updated = currentMasterClasses.map((c) => {
      if (c.id === masterSelectedClassId) {
        return {
          ...c,
          subjects: c.subjects.filter((s) => s.id !== subjectId),
        };
      }
      return c;
    });

    setCurrentMasterClasses(updated);
    await updateStoredMasterClasses(updated);
    if (onUpdateMasterClasses) await onUpdateMasterClasses(updated);
    showNotification(`Mapel "${subjectName}" dihapus dari Kelas ${selectedMasterClass.name}.`);
  };

  const handleResetMasterData = async () => {
    if (
      !window.confirm(
        'Reset semua Master Data Kelas, Wali Kelas, dan Mapel ke data standar resmi SDIT AL FIKRI?'
      )
    ) {
      return;
    }
    setCurrentMasterClasses(MASTER_CLASSES);
    await updateStoredMasterClasses(MASTER_CLASSES);
    if (onUpdateMasterClasses) await onUpdateMasterClasses(MASTER_CLASSES);
    showNotification('Master Data berhasil direset ke standar resmi SDIT AL FIKRI.');
  };

  // --- SCHOOL YEARS HANDLERS ---
  const handleAddSchoolYear = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanYear = newYearInput.trim();
    if (!cleanYear) return;

    if (!/^\d{4}\/\d{4}$|^\d{4}-\d{4}$/.test(cleanYear)) {
      setYearError('Format tahun pelajaran harus YYYY/YYYY (contoh: 2026/2027)');
      return;
    }

    if (currentSchoolYears.includes(cleanYear)) {
      setYearError('Tahun pelajaran sudah terdaftar.');
      return;
    }

    setYearError(null);
    const updated = await addStoredSchoolYear(cleanYear);
    setCurrentSchoolYears(updated);
    setNewYearInput('');
    showNotification(`Tahun Pelajaran "${cleanYear}" berhasil ditambahkan.`);
  };

  const handleDeleteSchoolYear = async (yr: string) => {
    if (currentSchoolYears.length <= 1) {
      alert('Minimal harus ada 1 tahun pelajaran aktif.');
      return;
    }
    if (!window.confirm(`Hapus tahun pelajaran "${yr}" dari pilihan?`)) return;

    const updated = await deleteStoredSchoolYear(yr);
    setCurrentSchoolYears(updated);
    if (schoolYear === yr) {
      setSchoolYear(updated[0] || '2025/2026');
    }
    showNotification(`Tahun Pelajaran "${yr}" dihapus.`);
  };

  // --- SAVE ALL SESSION SETTINGS ---
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const updated: ExamSessionConfig = {
        ...examSession,
        name: sessionName.trim() || examSession.name,
        schoolYear,
        activeClasses,
        activeSubjects,
        updatedAt: new Date().toISOString(),
      };
      await onSaveSession(updated);
      onClose();
    } catch (e) {
      console.error('Failed to save session settings:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const currentSelectedClass =
    currentMasterClasses.find((c) => c.id === selectedClassTab) ||
    currentMasterClasses[0] ||
    MASTER_CLASSES[0];
  const isSelectedClassActive = activeClasses[currentSelectedClass.id];

  const activeSubCountForSelected = currentSelectedClass.subjects.filter(
    (s) => activeSubjects[currentSelectedClass.id]?.[s.id] !== false
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#181B26] border border-[#272D3E] rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-3">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#272D3E] flex items-center justify-between bg-[#151722]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center text-lg font-bold">
              ⚙️
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Pusat Pengaturan Ujian & Master Data
              </h2>
              <p className="text-xs text-slate-400">
                Kelola mapel aktif ujian, master wali kelas, guru pengampu, dan tahun pelajaran
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b border-[#272D3E] bg-[#12141D] flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveMainTab('session')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMainTab === 'session'
                ? 'bg-[#181B26] text-amber-400 border-t-2 border-amber-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>1. Pengaturan Ujian Berjalan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('master')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMainTab === 'master'
                ? 'bg-[#181B26] text-amber-400 border-t-2 border-amber-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>2. Master Kelas, Walas & Mapel</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('years')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMainTab === 'years'
                ? 'bg-[#181B26] text-amber-400 border-t-2 border-amber-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>3. Kelola Tahun Pelajaran</span>
          </button>
        </div>

        {/* Feedback Message Bar */}
        {feedbackMsg && (
          <div className="px-5 py-2 bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Tab 1: PENGATURAN UJIAN BERJALAN */}
        {activeMainTab === 'session' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* Live Calculation Banner */}
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="text-slate-300">
                  Target Naskah Terhitung:{' '}
                  <strong className="text-amber-400 text-sm font-black">{calculatedTarget}</strong>{' '}
                  Naskah ({totalActiveClasses} dari {currentMasterClasses.length} Kelas Aktif)
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetSessionToDefault}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
              >
                Reset Semua Aktif
              </button>
            </div>

            {/* Exam Name & Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nama / Jenis Ujian
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Contoh: STS Ganjil, SAS Ganjil, US Kelas 6"
                  className="w-full px-3 py-2 bg-[#12141D] border border-[#272D3E] focus:border-amber-400 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Tahun Pelajaran
                </label>
                <select
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                  className="w-full px-3 py-2 bg-[#12141D] border border-[#272D3E] focus:border-amber-400 rounded-xl text-xs text-white focus:outline-none cursor-pointer"
                >
                  {currentSchoolYears.map((yr) => (
                    <option key={yr} value={yr} className="bg-[#181B26] text-white">
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Class Activation Overview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Kelas Peserta Ujian:
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleSetAllClasses(true)}
                    className="text-amber-400 hover:underline cursor-pointer"
                  >
                    Aktifkan Semua
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => handleSetAllClasses(false)}
                    className="text-slate-400 hover:text-rose-400 hover:underline cursor-pointer"
                  >
                    Nonaktifkan Semua
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {currentMasterClasses.map((c) => {
                  const isActive = activeClasses[c.id];
                  const activeCount = c.subjects.filter(
                    (s) => activeSubjects[c.id]?.[s.id] !== false
                  ).length;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleToggleClass(c.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-500/10 border-amber-400/50 text-white shadow-xs'
                          : 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-xs">{c.name}</span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isActive ? 'bg-emerald-400' : 'bg-slate-600'
                          }`}
                        ></span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {c.waliKelas}
                      </div>
                      <div className="text-[9px] mt-1 text-amber-400 font-semibold">
                        {isActive ? `${activeCount}/${c.subjects.length} Mapel` : 'Nonaktif'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detailed Subject Configuration per Class */}
            <div className="bg-[#12141D] border border-[#272D3E] rounded-2xl p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#272D3E]">
                <div>
                  <h3 className="text-xs font-bold text-white">
                    Pilih Mapel Diujikan per Rombel
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Klik tab kelas untuk mencentang mapel apa saja yang diujikan
                  </p>
                </div>

                {/* Class Selector Tabs */}
                <div className="flex flex-wrap gap-1">
                  {currentMasterClasses.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedClassTab(c.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        selectedClassTab === c.id
                          ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                          : activeClasses[c.id]
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-900/80 text-slate-600 hover:text-slate-400'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Class Header Info & Quick Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3 bg-[#181B26] p-3 rounded-xl border border-[#272D3E]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-300 font-black flex items-center justify-center text-xs">
                    {currentSelectedClass.name}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        Kelas {currentSelectedClass.name}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        (Wali: <strong className="text-amber-400">{currentSelectedClass.waliKelas}</strong>)
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Status:{' '}
                      <strong className={isSelectedClassActive ? 'text-emerald-400' : 'text-rose-400'}>
                        {isSelectedClassActive ? 'Aktif Ujian' : 'Tidak Mengikuti'}
                      </strong>{' '}
                      • {activeSubCountForSelected} dari {currentSelectedClass.subjects.length} Mapel Aktif
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleClass(currentSelectedClass.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      isSelectedClassActive
                        ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                    }`}
                  >
                    {isSelectedClassActive ? 'Nonaktifkan Kelas' : 'Aktifkan Kelas'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllSubjectsForClass(currentSelectedClass.id, true)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllSubjectsForClass(currentSelectedClass.id, false)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    Hapus Centang
                  </button>
                </div>
              </div>

              {/* Subject Checkboxes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentSelectedClass.subjects.map((sub, idx) => {
                  const isSubActive =
                    activeSubjects[currentSelectedClass.id]?.[sub.id] !== false;

                  return (
                    <div
                      key={sub.id}
                      onClick={() => handleToggleSubject(currentSelectedClass.id, sub.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                        isSubActive
                          ? 'bg-[#181B26] border-emerald-500/30 text-white hover:border-emerald-500/60'
                          : 'bg-[#151722]/60 border-slate-800 text-slate-500 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="text-[10px] font-bold text-slate-500 w-4">
                          {idx + 1}.
                        </span>
                        <div className="truncate">
                          <p className={`text-xs font-semibold truncate ${isSubActive ? 'text-slate-100' : 'text-slate-500 line-through'}`}>
                            {sub.name}
                          </p>
                          {sub.teacher && (
                            <p className="text-[10px] text-amber-400/90 truncate">
                              Guru: {sub.teacher}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex items-center gap-2">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isSubActive
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {isSubActive ? 'Diujikan' : 'Off'}
                        </span>
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] font-black ${
                            isSubActive
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                              : 'bg-slate-900 border-slate-700 text-transparent'
                          }`}
                        >
                          ✓
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: MASTER DATA KELAS, WALAS & MAPEL */}
        {activeMainTab === 'master' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            <div className="p-3.5 bg-blue-500/10 border border-blue-500/25 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-400" />
                <span className="text-slate-300">
                  Perubahan Master Data akan otomatis tersinkronisasi ke seluruh sistem & database Firestore.
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetMasterData}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
              >
                Reset ke Standar SDIT AL FIKRI
              </button>
            </div>

            {/* Class Selection Buttons */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Pilih Kelas untuk Diedit:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {currentMasterClasses.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setMasterSelectedClassId(c.id);
                      setIsEditingWali(false);
                      setEditingSubjectId(null);
                      setIsAddingSubject(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      masterSelectedClassId === c.id
                        ? 'bg-amber-400 text-slate-950 shadow-md'
                        : 'bg-[#12141D] hover:bg-slate-800 text-slate-300 border border-[#272D3E]'
                    }`}
                  >
                    Kelas {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Edit Wali Kelas Box */}
            <div className="bg-[#12141D] border border-[#272D3E] rounded-2xl p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#272D3E]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 font-black flex items-center justify-center text-sm">
                    {selectedMasterClass.name}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Data Rombel Kelas {selectedMasterClass.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Wali Kelas Saat Ini: <strong className="text-amber-400">{selectedMasterClass.waliKelas}</strong>
                    </p>
                  </div>
                </div>

                {!isEditingWali ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingWaliKelas(selectedMasterClass.waliKelas);
                      setIsEditingWali(true);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Ubah Nama Wali Kelas</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingWaliKelas}
                      onChange={(e) => setEditingWaliKelas(e.target.value)}
                      placeholder="Nama Wali Kelas baru..."
                      className="px-3 py-1.5 bg-[#181B26] border border-amber-400 rounded-xl text-xs text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveWaliKelas}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingWali(false)}
                      className="px-2.5 py-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>

              {/* Master Subjects Header & Add Button */}
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Daftar Mata Pelajaran ({selectedMasterClass.subjects.length} Mapel)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Ubah nama mapel, edit guru pengampu, atau tambahkan mapel baru
                  </p>
                </div>

                {!isAddingSubject && (
                  <button
                    type="button"
                    onClick={() => setIsAddingSubject(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Mapel Baru</span>
                  </button>
                )}
              </div>

              {/* Add New Subject Form */}
              {isAddingSubject && (
                <form
                  onSubmit={handleAddNewSubject}
                  className="mt-3 p-3.5 bg-[#181B26] border border-emerald-500/40 rounded-xl space-y-3"
                >
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Mata Pelajaran Baru ke Kelas {selectedMasterClass.name}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Nama Mata Pelajaran *
                      </label>
                      <input
                        type="text"
                        required
                        value={newSubjectName}
                        onChange={(e) => setNewSubjectName(e.target.value)}
                        placeholder="Contoh: BAHASA SUNDA, TIK, ROBOTIK"
                        className="w-full px-3 py-2 bg-[#12141D] border border-[#272D3E] focus:border-amber-400 rounded-xl text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Nama Guru Pengampu (Opsional)
                      </label>
                      <input
                        type="text"
                        value={newSubjectTeacher}
                        onChange={(e) => setNewSubjectTeacher(e.target.value)}
                        placeholder="Contoh: Bu Hj. Nedya, Pak Ikhlas"
                        className="w-full px-3 py-2 bg-[#12141D] border border-[#272D3E] focus:border-amber-400 rounded-xl text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingSubject(false)}
                      className="px-3 py-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Tambahkan Mapel
                    </button>
                  </div>
                </form>
              )}

              {/* Master Subject List Table */}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#181B26] text-[10px] font-bold text-slate-400 border-b border-[#272D3E]">
                      <th className="py-2 px-3 w-8 text-center">No</th>
                      <th className="py-2 px-3">Nama Mata Pelajaran</th>
                      <th className="py-2 px-3">Guru Pengampu</th>
                      <th className="py-2 px-3 w-28 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#272D3E]/50">
                    {selectedMasterClass.subjects.map((sub, idx) => {
                      const isEditingThis = editingSubjectId === sub.id;

                      return (
                        <tr key={sub.id} className="hover:bg-slate-800/20">
                          <td className="py-2 px-3 text-center text-slate-500 font-bold">
                            {idx + 1}
                          </td>

                          {/* Subject Name */}
                          <td className="py-2 px-3">
                            {isEditingThis ? (
                              <input
                                type="text"
                                value={editSubjectName}
                                onChange={(e) => setEditSubjectName(e.target.value)}
                                className="w-full px-2 py-1 bg-[#12141D] border border-amber-400 rounded-lg text-xs text-white focus:outline-none"
                              />
                            ) : (
                              <span className="font-semibold text-white">
                                {sub.name}
                              </span>
                            )}
                          </td>

                          {/* Teacher Name */}
                          <td className="py-2 px-3">
                            {isEditingThis ? (
                              <input
                                type="text"
                                value={editSubjectTeacher}
                                onChange={(e) => setEditSubjectTeacher(e.target.value)}
                                placeholder="Nama guru..."
                                className="w-full px-2 py-1 bg-[#12141D] border border-amber-400 rounded-lg text-xs text-white focus:outline-none"
                              />
                            ) : (
                              <span className="text-amber-400/90 font-medium">
                                {sub.teacher ? sub.teacher : <em className="text-slate-500 font-normal">Sesuai Wali Kelas / Belum diatur</em>}
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-2 px-3 text-center">
                            {isEditingThis ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditSubject(sub.id)}
                                  className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg cursor-pointer"
                                  title="Simpan"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSubjectId(null)}
                                  className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                                  title="Batal"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditSubject(sub)}
                                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Mapel & Guru"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubject(sub.id, sub.name)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Mapel"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: KELOLA TAHUN PELAJARAN */}
        {activeMainTab === 'years' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center gap-3 text-xs text-slate-300">
              <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                Tahun pelajaran yang ditambahkan di sini akan langsung terhubung ke seluruh filter pencarian, form upload, dan monitoring tracking.
              </span>
            </div>

            {/* Add New School Year Form */}
            <form onSubmit={handleAddSchoolYear} className="bg-[#12141D] border border-[#272D3E] rounded-2xl p-4 sm:p-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                Tambah Tahun Pelajaran Baru
              </h3>
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    required
                    value={newYearInput}
                    onChange={(e) => setNewYearInput(e.target.value)}
                    placeholder="Contoh: 2026/2027 atau 2027/2028"
                    className="w-full px-3.5 py-2.5 bg-[#181B26] border border-[#272D3E] focus:border-amber-400 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Tahun</span>
                </button>
              </div>
              {yearError && (
                <p className="text-xs text-rose-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{yearError}</span>
                </p>
              )}
            </form>

            {/* List of Active School Years */}
            <div className="bg-[#12141D] border border-[#272D3E] rounded-2xl p-4 sm:p-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                Daftar Tahun Pelajaran Tersedia ({currentSchoolYears.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {currentSchoolYears.map((yr) => (
                  <div
                    key={yr}
                    className="p-3 bg-[#181B26] border border-[#272D3E] rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-400/15 text-amber-400 font-bold flex items-center justify-center text-xs">
                        📅
                      </div>
                      <span className="text-xs font-bold text-white">{yr}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSchoolYear(yr)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Tahun Pelajaran"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#272D3E] bg-[#151722] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {activeMainTab === 'session' ? (
              <span>Target: <strong className="text-white">{calculatedTarget} naskah</strong> ({totalActiveClasses} kelas)</span>
            ) : (
              <span>Master Data SDIT AL FIKRI</span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/50 text-slate-950 text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan & Terapkan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
