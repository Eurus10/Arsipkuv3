import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  Copy,
  Edit3,
  GraduationCap,
  Layers3,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  Save,
  Target,
  X,
  School,
  KeyRound,
  HeartHandshake,
  Search,
  Filter,
} from 'lucide-react';
import TeacherAssignmentPanel from './TeacherAssignmentPanel';
import AcademicPeriodPanel from './AcademicPeriodPanel';
import SchoolIdentityPanel from './SchoolIdentityPanel';
import TeacherPinSecurityPanel from './TeacherPinSecurityPanel';
import { GradeRangePanel } from './GradeRangePanel';
import { CharacterMasterPanel } from './CharacterMasterPanel';
import {
  AcademicLevel,
  AcademicSubject,
  SubjectCategory,
  copySubjectsFromLevel,
  createAcademicSubject,
  detectCategoryFromName,
  fetchAcademicLevels,
  fetchAcademicSubjects,
  updateAcademicSubject,
} from '../../services/academicSubjectStorage';

export type AcademicSectionType =
  | 'master'
  | 'grade_range'
  | 'character'
  | 'assignments'
  | 'periods'
  | 'school_identity'
  | 'security_pins';

interface AcademicSettingsViewProps {
  showNotification?: (message: string, type?: 'success' | 'info') => void;
  initialSection?: AcademicSectionType;
  hideHeader?: boolean;
  hideTabs?: boolean;
}

type SubjectFormState = {
  name: string;
  code: string;
  category: SubjectCategory;
  displayOrder: string;
};

const emptySubjectForm: SubjectFormState = {
  name: '',
  code: '',
  category: 'umum',
  displayOrder: '0',
};

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '');
    if (message.toLowerCase().includes('duplicate') || message.includes('23505')) {
      return 'Data dengan nama atau kode tersebut sudah ada.';
    }
    return message || 'Terjadi kesalahan saat menyimpan data.';
  }
  return 'Terjadi kesalahan saat menyimpan data.';
}

export const AcademicSettingsView: React.FC<AcademicSettingsViewProps> = ({
  showNotification,
  initialSection = 'master',
  hideHeader = false,
  hideTabs = false,
}) => {
  const [levels, setLevels] = useState<AcademicLevel[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [subjects, setSubjects] = useState<AcademicSubject[]>([]);
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | SubjectCategory>('all');

  const [isLoadingLevels, setIsLoadingLevels] = useState(true);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [saving, setSaving] = useState(false);

  const [subjectModal, setSubjectModal] = useState<{ mode: 'add' | 'edit'; item?: AcademicSubject } | null>(null);
  const [subjectForm, setSubjectForm] = useState<SubjectFormState>(emptySubjectForm);
  const [userExplicitlyChangedCategory, setUserExplicitlyChangedCategory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<AcademicSectionType>(initialSection);

  // Copy Modal State
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySourceLevelId, setCopySourceLevelId] = useState('');
  const [sourceLevelSubjects, setSourceLevelSubjects] = useState<AcademicSubject[]>([]);
  const [selectedSubjectIdsToCopy, setSelectedSubjectIdsToCopy] = useState<string[]>([]);
  const [isLoadingSourceSubjects, setIsLoadingSourceSubjects] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  // Level subjects count cache for UI pills
  const [levelSubjectCounts, setLevelSubjectCounts] = useState<Record<string, number>>({});

  const selectedLevel = useMemo(
    () => levels.find((level) => level.id === selectedLevelId) || null,
    [levels, selectedLevelId]
  );

  const activeSubjects = useMemo(() => subjects.filter((subject) => subject.active), [subjects]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const matchSearch =
        !subjectSearchQuery.trim() ||
        s.name.toLowerCase().includes(subjectSearchQuery.toLowerCase()) ||
        (s.code && s.code.toLowerCase().includes(subjectSearchQuery.toLowerCase()));

      const cat = s.category || detectCategoryFromName(s.name);
      const matchCat = selectedCategoryFilter === 'all' || cat === selectedCategoryFilter;

      return matchSearch && matchCat;
    });
  }, [subjects, subjectSearchQuery, selectedCategoryFilter]);

  const categoryStats = useMemo(() => {
    let agama = 0;
    let umum = 0;
    let mulok = 0;
    subjects.forEach((s) => {
      if (!s.active) return;
      const cat = s.category || detectCategoryFromName(s.name);
      if (cat === 'agama') agama++;
      else if (cat === 'mulok') mulok++;
      else umum++;
    });
    return { total: activeSubjects.length, agama, umum, mulok };
  }, [subjects, activeSubjects]);

  const notify = (message: string, type: 'success' | 'info' = 'success') => {
    showNotification?.(message, type);
  };

  const loadLevels = async (keepSelection = true) => {
    setIsLoadingLevels(true);
    setError(null);
    try {
      const data = await fetchAcademicLevels();
      setLevels(data);
      if (!keepSelection || !data.some((level) => level.id === selectedLevelId)) {
        setSelectedLevelId(data[0]?.id || '');
      }

      // Load counts for each level
      const counts: Record<string, number> = {};
      await Promise.all(
        data.map(async (lvl) => {
          try {
            const subs = await fetchAcademicSubjects(lvl.id);
            counts[lvl.id] = subs.filter((s) => s.active).length;
          } catch {
            counts[lvl.id] = 0;
          }
        })
      );
      setLevelSubjectCounts(counts);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingLevels(false);
    }
  };

  const loadSubjects = async (levelId: string) => {
    if (!levelId) {
      setSubjects([]);
      return;
    }

    setIsLoadingSubjects(true);
    setError(null);
    try {
      const data = await fetchAcademicSubjects(levelId);
      setSubjects(data);
      // Update count cache for this level
      setLevelSubjectCounts((prev) => ({
        ...prev,
        [levelId]: data.filter((s) => s.active).length,
      }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  useEffect(() => {
    loadLevels(false);
    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadSubjects(selectedLevelId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLevelId]);

  const openAddSubject = () => {
    setError(null);
    setUserExplicitlyChangedCategory(false);
    setSubjectForm({
      ...emptySubjectForm,
      category: 'umum',
      displayOrder: String((activeSubjects.length + 1) * 10),
    });
    setSubjectModal({ mode: 'add' });
  };

  const openEditSubject = (subject: AcademicSubject) => {
    setError(null);
    setUserExplicitlyChangedCategory(true);
    setSubjectForm({
      name: subject.name,
      code: subject.code || '',
      category: subject.category || detectCategoryFromName(subject.name),
      displayOrder: String(subject.display_order),
    });
    setSubjectModal({ mode: 'edit', item: subject });
  };

  const handleSaveSubject = async () => {
    if (!selectedLevelId || !subjectForm.name.trim()) {
      setError('Nama mata pelajaran wajib diisi.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (subjectModal?.mode === 'edit' && subjectModal.item) {
        await updateAcademicSubject(subjectModal.item.id, {
          name: subjectForm.name,
          code: subjectForm.code,
          category: subjectForm.category,
          display_order: Number(subjectForm.displayOrder) || 0,
        });
        notify('Mata pelajaran berhasil diperbarui.');
      } else {
        await createAcademicSubject({
          academic_level_id: selectedLevelId,
          name: subjectForm.name,
          code: subjectForm.code,
          category: subjectForm.category,
          display_order: Number(subjectForm.displayOrder) || 0,
        });
        notify('Mata pelajaran berhasil ditambahkan.');
      }

      setSubjectModal(null);
      await loadSubjects(selectedLevelId);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSubject = async (subject: AcademicSubject) => {
    setSaving(true);
    setError(null);
    try {
      await updateAcademicSubject(subject.id, { active: !subject.active });
      notify(
        `Mata pelajaran "${subject.name}" ${subject.active ? 'dinonaktifkan' : 'diaktifkan'}.`,
        'info'
      );
      await loadSubjects(selectedLevelId);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Copy Modal logic
  const openCopyModal = async () => {
    const otherLevels = levels.filter((l) => l.id !== selectedLevelId);
    if (otherLevels.length === 0) return;

    const initialSource = otherLevels[0].id;
    setCopySourceLevelId(initialSource);
    setSelectedSubjectIdsToCopy([]);
    setCopyError(null);
    setIsCopyModalOpen(true);
    await loadSourceSubjects(initialSource);
  };

  const loadSourceSubjects = async (sourceId: string) => {
    setIsLoadingSourceSubjects(true);
    setCopyError(null);
    try {
      const data = await fetchAcademicSubjects(sourceId);
      const activeOnly = data.filter((s) => s.active);
      setSourceLevelSubjects(activeOnly);

      // Pre-select subjects that do not already exist in target level by name
      const targetNames = new Set(subjects.map((s) => s.name.trim().toLowerCase()));
      const availableToCopy = activeOnly
        .filter((s) => !targetNames.has(s.name.trim().toLowerCase()))
        .map((s) => s.id);
      setSelectedSubjectIdsToCopy(availableToCopy);
    } catch (err) {
      setCopyError(getErrorMessage(err));
    } finally {
      setIsLoadingSourceSubjects(false);
    }
  };

  const handleSourceLevelChange = async (newSourceId: string) => {
    setCopySourceLevelId(newSourceId);
    await loadSourceSubjects(newSourceId);
  };

  const handleToggleSelectSubjectToCopy = (id: string) => {
    setSelectedSubjectIdsToCopy((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllAvailable = () => {
    const targetNames = new Set(subjects.map((s) => s.name.trim().toLowerCase()));
    const available = sourceLevelSubjects
      .filter((s) => !targetNames.has(s.name.trim().toLowerCase()))
      .map((s) => s.id);
    setSelectedSubjectIdsToCopy(available);
  };

  const handleDeselectAll = () => {
    setSelectedSubjectIdsToCopy([]);
  };

  const handleExecuteCopy = async () => {
    if (!copySourceLevelId || !selectedLevelId) return;
    if (selectedSubjectIdsToCopy.length === 0) {
      setCopyError('Pilih minimal satu mata pelajaran untuk disalin.');
      return;
    }

    setIsCopying(true);
    setCopyError(null);
    try {
      const result = await copySubjectsFromLevel({
        sourceLevelId: copySourceLevelId,
        targetLevelId: selectedLevelId,
        subjectIdsToCopy: selectedSubjectIdsToCopy,
        copyObjectives: false,
      });

      notify(
        `${result.copiedSubjectsCount} mata pelajaran berhasil disalin ke Kelas ${selectedLevel?.grade}.`
      );

      setIsCopyModalOpen(false);
      await loadSubjects(selectedLevelId);
    } catch (err) {
      setCopyError(getErrorMessage(err));
    } finally {
      setIsCopying(false);
    }
  };

  if (isLoadingLevels) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <p className="text-sm font-semibold">Memuat struktur akademik SDIT AL FIKRI...</p>
        </div>
      </div>
    );
  }

  const existingSubjectNamesInTarget = new Set(
    subjects.map((s) => s.name.trim().toLowerCase())
  );

  return (
    <div className={`max-w-[1500px] mx-auto ${hideHeader ? 'p-0 space-y-4' : 'px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-10 space-y-4 sm:space-y-5'}`}>
      {/* Sticky Compact Glassmorphism Header */}
      {!hideHeader && (
        <header className="sticky top-0 z-30 -mx-1 sm:mx-0 mb-4 sm:mb-5 rounded-2xl border border-white/[0.08] bg-slate-950/80 backdrop-blur-2xl shadow-lg shadow-black/20">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent" />
          <div className="px-3.5 sm:px-5 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/25 text-cyan-300 flex items-center justify-center shrink-0">
                <Layers3 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-white truncate">
                    Pengaturan Akademik
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300 text-[9px] font-black uppercase tracking-wider">
                    Master Standar Sekolah
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Master Mata Pelajaran, Rentang Predikat, 18 Karakter, dan Penugasan Guru SDIT AL FIKRI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  loadLevels(true);
                  if (selectedLevelId) loadSubjects(selectedLevelId);
                }}
                className="px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Muat ulang data"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Muat Ulang</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 flex items-start gap-3 backdrop-blur-xl">
          <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center shrink-0 text-xs font-black">!</div>
          <div className="flex-1 text-xs text-rose-200 leading-relaxed font-semibold">{error}</div>
          <button type="button" onClick={() => setError(null)} className="text-rose-300/70 hover:text-rose-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modern Glass Segmented Tab Switcher (7 Tabs) */}
      {!hideTabs && (
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl border border-white/[0.08] bg-slate-950/60 backdrop-blur-xl w-fit flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSection('master')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSection === 'master'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Master Mapel</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('grade_range')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSection === 'grade_range'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Rentang Predikat & KKTP</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('character')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSection === 'character'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Master 18 Karakter</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('assignments')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSection === 'assignments'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Penugasan Guru</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('periods')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSection === 'periods'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Periode Akademik</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('school_identity')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSection === 'school_identity'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <School className="w-3.5 h-3.5" />
            <span>Identitas Sekolah & Rapor</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('security_pins')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSection === 'security_pins'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Keamanan PIN Guru</span>
          </button>
        </div>
      )}

      {/* Render Sub-Panels based on Active Section */}
      {activeSection === 'grade_range' ? (
        <GradeRangePanel showNotification={showNotification} />
      ) : activeSection === 'character' ? (
        <CharacterMasterPanel showNotification={showNotification} />
      ) : activeSection === 'assignments' ? (
        <TeacherAssignmentPanel showNotification={showNotification} />
      ) : activeSection === 'periods' ? (
        <AcademicPeriodPanel showNotification={showNotification} />
      ) : activeSection === 'school_identity' ? (
        <SchoolIdentityPanel showNotification={showNotification} />
      ) : activeSection === 'security_pins' ? (
        <TeacherPinSecurityPanel showNotification={showNotification} />
      ) : (
        /* Section Master Mapel (Restrukturisasi Bersih & Praktis) */
        <div className="space-y-4 sm:space-y-5">
          {/* Level/Jenjang Pills with Subject Count */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {levels.map((level) => {
              const active = selectedLevelId === level.id;
              const count = levelSubjectCounts[level.id] ?? 0;
              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => {
                    setSelectedLevelId(level.id);
                  }}
                  className={`group shrink-0 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2.5 ${
                    active
                      ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/30'
                      : 'bg-slate-950/45 border-white/[0.07] text-slate-400 hover:text-white hover:border-white/[0.15] hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="font-black text-sm">Kelas {level.grade}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      active
                        ? 'bg-cyan-400/20 text-cyan-200'
                        : 'bg-white/[0.04] text-slate-500 group-hover:text-slate-300'
                    }`}
                  >
                    {count} mapel
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Category Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="rounded-2xl border border-white/[0.08] bg-slate-950/50 p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Mapel Aktif</p>
                <p className="text-lg font-black text-white mt-0.5">{categoryStats.total}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/25 text-cyan-300 flex items-center justify-center font-bold text-xs">
                {selectedLevel ? `K${selectedLevel.grade}` : 'SD'}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Pendidikan Agama</p>
                <p className="text-lg font-black text-white mt-0.5">{categoryStats.agama} <span className="text-xs font-normal text-emerald-300/70">Mapel</span></p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-center font-bold text-xs">
                PAI
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.04] p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">Mapel Umum</p>
                <p className="text-lg font-black text-white mt-0.5">{categoryStats.umum} <span className="text-xs font-normal text-cyan-300/70">Mapel</span></p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center font-bold text-xs">
                UM
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Muatan Lokal</p>
                <p className="text-lg font-black text-white mt-0.5">{categoryStats.mulok} <span className="text-xs font-normal text-amber-300/70">Mapel</span></p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center font-bold text-xs">
                MLK
              </div>
            </div>
          </div>

          {/* Full-width Comprehensive Mata Pelajaran Panel */}
          <section className="rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-slate-950/60 backdrop-blur-2xl overflow-hidden shadow-2xl">
            <div className="p-3.5 sm:p-4 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-black text-white truncate">
                    Daftar Mata Pelajaran Kelas {selectedLevel?.grade}
                  </h2>
                  <p className="text-[10px] text-slate-400">
                    Mata pelajaran yang akan tampil pada e-Rapor STS dan penugasan guru
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={openCopyModal}
                  disabled={!selectedLevelId || levels.length <= 1 || saving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] hover:bg-cyan-400/[0.16] hover:border-cyan-400/40 text-cyan-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  title="Salin mapel dari kelas/jenjang lain"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Mapel</span>
                </button>

                <button
                  type="button"
                  onClick={openAddSubject}
                  disabled={!selectedLevelId || saving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Mapel</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-3 sm:px-4 bg-white/[0.015] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2.5">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari mata pelajaran atau kode..."
                  value={subjectSearchQuery}
                  onChange={(e) => setSubjectSearchQuery(e.target.value)}
                  className="w-full h-8.5 pl-9 pr-7 rounded-xl border border-white/[0.08] bg-slate-900/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/40 transition-all"
                />
                {subjectSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setSubjectSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Segmented Filter */}
              <div className="flex items-center gap-1 bg-slate-900/60 p-0.5 rounded-xl border border-white/[0.06]">
                {(
                  [
                    ['all', 'Semua'],
                    ['agama', 'Agama'],
                    ['umum', 'Umum'],
                    ['mulok', 'Mulok'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(key)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      selectedCategoryFilter === key
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Table Grid */}
            {isLoadingSubjects ? (
              <div className="min-h-[280px] flex items-center justify-center text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : subjects.length === 0 ? (
              <div className="min-h-[280px] flex flex-col items-center justify-center text-center px-6 py-10">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-slate-500 flex items-center justify-center mb-3">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-200">Belum ada mata pelajaran</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                  Data Mapel pada Kelas {selectedLevel?.grade} masih kosong. Anda dapat menyalin dari kelas lain atau menambahkannya secara manual.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openCopyModal}
                    className="px-3.5 py-1.5 rounded-xl border border-cyan-400/30 bg-cyan-400/[0.1] hover:bg-cyan-400/[0.18] text-cyan-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Salin dari Kelas Lain
                  </button>
                  <button
                    type="button"
                    onClick={openAddSubject}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Baru
                  </button>
                </div>
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="min-h-[200px] flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
                Tidak ada mata pelajaran yang cocok dengan kata kunci pencarian / filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-slate-900/70 text-slate-300 font-semibold">
                      <th className="py-3 px-3.5 w-14 text-center">Urutan</th>
                      <th className="py-3 px-4 min-w-[220px]">Nama Mata Pelajaran</th>
                      <th className="py-3 px-3 w-28">Kode Mapel</th>
                      <th className="py-3 px-3 w-36">Kelompok / Kategori</th>
                      <th className="py-3 px-3 w-28 text-center">Status</th>
                      <th className="py-3 px-4 w-32 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredSubjects.map((subject) => {
                      const cat = subject.category || detectCategoryFromName(subject.name);

                      return (
                        <tr
                          key={subject.id}
                          className="hover:bg-white/[0.025] transition-colors group"
                        >
                          {/* Urutan */}
                          <td className="py-3 px-3.5 text-center">
                            <span className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] font-black text-slate-300">
                              {String(subject.display_order || 0).padStart(2, '0')}
                            </span>
                          </td>

                          {/* Nama Mapel */}
                          <td className="py-3 px-4">
                            <div className={`text-xs sm:text-sm font-bold ${subject.active ? 'text-white' : 'text-slate-500 line-through'}`}>
                              {subject.name}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Jenjang Kelas {selectedLevel?.grade}
                            </div>
                          </td>

                          {/* Kode */}
                          <td className="py-3 px-3">
                            {subject.code ? (
                              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/[0.06] text-amber-300 border border-white/[0.08]">
                                {subject.code}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">-</span>
                            )}
                          </td>

                          {/* Kategori */}
                          <td className="py-3 px-3">
                            {cat === 'agama' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                                🟢 Pendidikan Agama
                              </span>
                            ) : cat === 'mulok' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/25">
                                🟠 Muatan Lokal
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                🔵 Mapel Umum
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 text-center">
                            {subject.active ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                <Check className="w-3 h-3" />
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                Nonaktif
                              </span>
                            )}
                          </td>

                          {/* Aksi */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditSubject(subject)}
                                title="Edit Mata Pelajaran"
                                className="h-8 px-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                                <span className="hidden sm:inline">Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleSubject(subject)}
                                disabled={saving}
                                title={subject.active ? 'Nonaktifkan Mapel' : 'Aktifkan Mapel'}
                                className={`h-8 px-2.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer ${
                                  subject.active
                                    ? 'border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                                    : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                                }`}
                              >
                                <Power className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{subject.active ? 'Nonaktif' : 'Aktifkan'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Modal Salin Mapel dari Kelas Lain */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-xl rounded-2xl sm:rounded-3xl bg-slate-950/95 border border-white/[0.12] shadow-2xl overflow-hidden relative">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-400/15 border border-cyan-400/25 text-cyan-300 flex items-center justify-center shrink-0">
                  <Copy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    Salin Mapel ke Kelas {selectedLevel?.grade}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Gandakan mata pelajaran dari kelas lain beserta urutan tampil dan kategorinya
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/[0.04] text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {copyError && (
                <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 flex items-center gap-2.5 text-xs text-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{copyError}</span>
                </div>
              )}

              {/* Selector Kelas Sumber */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                  Pilih Kelas Sumber:
                </label>
                <select
                  value={copySourceLevelId}
                  onChange={(e) => handleSourceLevelChange(e.target.value)}
                  className="w-full h-10 rounded-xl bg-slate-900 border border-white/[0.1] px-3 text-xs font-bold text-white outline-none focus:border-cyan-400/60 transition-all cursor-pointer"
                >
                  {levels
                    .filter((l) => l.id !== selectedLevelId)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        Kelas {l.grade} ({levelSubjectCounts[l.id] ?? 0} mapel aktif)
                      </option>
                    ))}
                </select>
              </div>

              {/* Subject checklist */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold text-slate-300">
                    Pilih Mapel yang Ingin Disalin:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllAvailable}
                      className="text-[10px] font-bold text-cyan-300 hover:text-cyan-200 cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-300 cursor-pointer"
                    >
                      Batal Semua
                    </button>
                  </div>
                </div>

                {isLoadingSourceSubjects ? (
                  <div className="py-8 flex items-center justify-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                  </div>
                ) : sourceLevelSubjects.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Kelas sumber belum memiliki mata pelajaran aktif.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1.5 rounded-xl border border-white/[0.07] bg-slate-900/50 p-2">
                    {sourceLevelSubjects.map((srcSub) => {
                      const alreadyExists = existingSubjectNamesInTarget.has(
                        srcSub.name.trim().toLowerCase()
                      );
                      const isChecked = selectedSubjectIdsToCopy.includes(srcSub.id);
                      const cat = srcSub.category || detectCategoryFromName(srcSub.name);

                      return (
                        <div
                          key={srcSub.id}
                          onClick={() => {
                            if (!alreadyExists) handleToggleSelectSubjectToCopy(srcSub.id);
                          }}
                          className={`flex items-center justify-between gap-3 p-2 rounded-lg transition-all ${
                            alreadyExists
                              ? 'opacity-50 cursor-not-allowed bg-white/[0.01]'
                              : isChecked
                              ? 'bg-cyan-500/10 border border-cyan-400/25 cursor-pointer'
                              : 'hover:bg-white/[0.03] cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={alreadyExists}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 rounded text-cyan-500 focus:ring-cyan-400/40 bg-slate-900 border-white/[0.2] cursor-pointer"
                            />
                            <div className="w-6 h-6 rounded bg-white/[0.04] border border-white/[0.08] text-[9px] font-black text-slate-400 flex items-center justify-center shrink-0">
                              {String(srcSub.display_order || 0).padStart(2, '0')}
                            </div>
                            <span className="text-xs font-bold text-white truncate">
                              {srcSub.name}
                            </span>
                            {cat === 'agama' ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 shrink-0">
                                Agama
                              </span>
                            ) : cat === 'mulok' ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25 shrink-0">
                                Mulok
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shrink-0">
                                Umum
                              </span>
                            )}
                            {srcSub.code && (
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/[0.05] text-slate-400 border border-white/[0.08]">
                                {srcSub.code}
                              </span>
                            )}
                          </div>

                          {alreadyExists && (
                            <span className="shrink-0 text-[9px] font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                              Sudah Ada
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => setIsCopyModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-400 hover:text-white text-xs font-bold cursor-pointer transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteCopy}
                  disabled={isCopying || selectedSubjectIdsToCopy.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-cyan-500/20"
                >
                  {isCopying ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  Salin {selectedSubjectIdsToCopy.length} Mapel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add/Edit Subject with Modern Glassmorphism Styling */}
      {subjectModal && (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-slate-950/95 border border-white/[0.12] shadow-2xl overflow-hidden relative">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">
                  {subjectModal.mode === 'add'
                    ? 'Tambah Mata Pelajaran'
                    : 'Edit Mata Pelajaran'}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Jenjang Kelas {selectedLevel?.grade || ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSubjectModal(null);
                  setError(null);
                }}
                className="w-8 h-8 rounded-xl bg-white/[0.04] text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <label className="block">
                <span className="text-[11px] font-bold text-slate-300">
                  Nama Mata Pelajaran *
                </span>
                <input
                  autoFocus
                  value={subjectForm.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setSubjectForm((prev) => ({
                      ...prev,
                      name: newName,
                      category:
                        subjectModal?.mode === 'add' && !userExplicitlyChangedCategory
                          ? detectCategoryFromName(newName)
                          : prev.category,
                    }));
                  }}
                  placeholder="Contoh: Pendidikan Agama Islam dan Budi Pekerti"
                  className="mt-1.5 w-full h-10 rounded-xl bg-slate-900 border border-white/[0.1] px-3 text-xs font-semibold text-white outline-none focus:border-cyan-400/60 transition-all"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[11px] font-bold text-slate-300">
                    Kelompok / Jenis Mapel *
                  </span>
                  <select
                    value={subjectForm.category}
                    onChange={(e) => {
                      setUserExplicitlyChangedCategory(true);
                      setSubjectForm((prev) => ({
                        ...prev,
                        category: e.target.value as SubjectCategory,
                      }));
                    }}
                    className="mt-1.5 w-full h-10 rounded-xl bg-slate-900 border border-white/[0.1] px-3 text-xs font-bold text-white outline-none focus:border-cyan-400/60 transition-all cursor-pointer"
                  >
                    <option value="agama">🟢 Pendidikan Agama (Kelompok A)</option>
                    <option value="umum">🔵 Mapel Umum (Kelompok B)</option>
                    <option value="mulok">🟠 Muatan Lokal (Kelompok C)</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-[11px] font-bold text-slate-300">
                    Kode Mapel <span className="text-slate-500">(opsional)</span>
                  </span>
                  <input
                    value={subjectForm.code}
                    onChange={(e) =>
                      setSubjectForm((prev) => ({ ...prev, code: e.target.value }))
                    }
                    placeholder="PAIBP / MTK"
                    className="mt-1.5 w-full h-10 rounded-xl bg-slate-900 border border-white/[0.1] px-3 text-xs font-semibold text-white outline-none focus:border-cyan-400/60 transition-all"
                  />
                </label>
              </div>

              <label className="block max-w-[160px]">
                <span className="text-[11px] font-bold text-slate-300">Urutan Tampil</span>
                <input
                  type="number"
                  min="0"
                  value={subjectForm.displayOrder}
                  onChange={(e) =>
                    setSubjectForm((prev) => ({ ...prev, displayOrder: e.target.value }))
                  }
                  className="mt-1.5 w-full h-10 rounded-xl bg-slate-900 border border-white/[0.1] px-3 text-xs font-semibold text-white outline-none focus:border-cyan-400/60 transition-all"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => {
                    setSubjectModal(null);
                    setError(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-400 hover:text-white text-xs font-bold cursor-pointer transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveSubject}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 text-xs font-black disabled:opacity-50 cursor-pointer shadow-md shadow-cyan-500/20 transition-all"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicSettingsView;
