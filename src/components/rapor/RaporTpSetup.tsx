import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  BookOpen,
  Calculator,
  Check,
  CheckCircle2,
  ChevronRight,
  Edit3,
  FileText,
  Globe,
  GripVertical,
  Heart,
  Languages,
  Layers,
  MoreVertical,
  Moon,
  Palette,
  Plus,
  Save,
  Search,
  Shield,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { RaporSubject, LearningObjective } from '../../types/raporSts';

interface RaporTpSetupProps {
  subjects: RaporSubject[];
  onUpdateSubjects: (updated: RaporSubject[]) => void | Promise<void>;
  fase: string;
  gradeLevel?: string;
  classLevel?: string;
  onNextToScores?: () => void;
  readOnly?: boolean;
  initialSubjectId?: string;
  allowedSubjectIds?: string[];
  isHomeroom?: boolean;
  onSelectSubject?: (subjectId: string) => void;
}

const getSubjectMeta = (name: string, category?: string) => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('agama') || category === 'agama' || lower.includes('islam') || lower.includes('qur')) {
    return {
      categoryLabel: 'Agama',
      categoryClass: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
      icon: Moon,
      defaultDesc: 'Membentuk peserta didik yang beriman, bertakwa, dan berakhlak mulia sesuai ajaran Islam.',
    };
  }
  if (lower.includes('indonesia')) {
    return {
      categoryLabel: 'Umum',
      categoryClass: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
      icon: FileText,
      defaultDesc: 'Mengembangkan kemahiran berbahasa Indonesia yang santun, kritis, dan komunikatif.',
    };
  }
  if (lower.includes('matematika') || lower.includes('mtk')) {
    return {
      categoryLabel: 'Umum',
      categoryClass: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
      icon: Calculator,
      defaultDesc: 'Membangun kemampuan bernalar logis, numerasi terstruktur, dan pemecahan masalah.',
    };
  }
  if (lower.includes('ipas') || lower.includes('alam') || lower.includes('sosial') || lower.includes('ipa') || lower.includes('ips')) {
    return {
      categoryLabel: 'Umum',
      categoryClass: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
      icon: Globe,
      defaultDesc: 'Memahami fenomena alam dan lingkungan sosial peserta didik secara terpadu.',
    };
  }
  if (lower.includes('arab') || lower.includes('inggris') || lower.includes('sunda') || lower.includes('jawa') || category === 'mulok') {
    return {
      categoryLabel: 'Mulok',
      categoryClass: 'border-purple-400/30 bg-purple-500/10 text-purple-300',
      icon: Languages,
      defaultDesc: 'Mengembangkan kecakapan bahasa dan wawasan kearifan budaya peserta didik.',
    };
  }
  if (lower.includes('seni') || lower.includes('sbdp') || lower.includes('musik') || lower.includes('rupa')) {
    return {
      categoryLabel: 'Umum',
      categoryClass: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
      icon: Palette,
      defaultDesc: 'Mengeksplorasi daya cipta estetika, apresiasi seni, dan kepekaan rasa.',
    };
  }
  if (lower.includes('pjok') || lower.includes('jasmani') || lower.includes('olahraga')) {
    return {
      categoryLabel: 'Umum',
      categoryClass: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
      icon: Activity,
      defaultDesc: 'Meningkatkan kebugaran jasmani, sportivitas, dan pola hidup sehat berkelanjutan.',
    };
  }
  if (lower.includes('pancasila') || lower.includes('pkn') || lower.includes('kewarganegaraan')) {
    return {
      categoryLabel: 'Umum',
      categoryClass: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
      icon: Shield,
      defaultDesc: 'Menanamkan nilai-nilai luhur Pancasila dan rasa cinta tanah air serta kebajikan.',
    };
  }
  return {
    categoryLabel: category === 'mulok' ? 'Mulok' : category === 'agama' ? 'Agama' : 'Umum',
    categoryClass: category === 'mulok' ? 'border-purple-400/30 bg-purple-500/10 text-purple-300' : category === 'agama' ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
    icon: BookOpen,
    defaultDesc: 'Mengembangkan capaian pembelajaran dan kompetensi esensial mata pelajaran.',
  };
};

export const RaporTpSetup: React.FC<RaporTpSetupProps> = ({
  subjects,
  onUpdateSubjects,
  fase,
  gradeLevel = '1',
  classLevel = '1A',
  onNextToScores,
  readOnly = false,
  initialSubjectId,
  allowedSubjectIds,
  isHomeroom = false,
  onSelectSubject,
}) => {
  // Filter subjects strictly based on allowedSubjectIds from teacherAcademicAccessService
  const visibleSubjects = useMemo(() => {
    if (!allowedSubjectIds) {
      return [...subjects].sort(
        (a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name)
      );
    }
    const allowedSet = new Set(allowedSubjectIds);
    return subjects
      .filter((subject) => allowedSet.has(subject.id))
      .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
  }, [subjects, allowedSubjectIds]);

  // Search filter query for subject sidebar
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered subjects based on search
  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return visibleSubjects;
    const q = searchQuery.toLowerCase().trim();
    return visibleSubjects.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q)
    );
  }, [visibleSubjects, searchQuery]);

  // Selected subject state, strictly initialized to an allowed subject
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    if (initialSubjectId && (!allowedSubjectIds || allowedSubjectIds.includes(initialSubjectId))) {
      return initialSubjectId;
    }
    const initialAllowed = allowedSubjectIds
      ? subjects.filter((s) => allowedSubjectIds.includes(s.id))
      : subjects;
    return initialAllowed[0]?.id || '';
  });

  const [notification, setNotification] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingTpId, setEditingTpId] = useState<string | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draftCode, setDraftCode] = useState('');
  const [draftDescription, setDraftDescription] = useState('');

  // Track initialSubjectId changes from parent without overwriting local user selections
  const lastInitialSubjectIdRef = useRef(initialSubjectId);
  useEffect(() => {
    if (initialSubjectId && initialSubjectId !== lastInitialSubjectIdRef.current) {
      lastInitialSubjectIdRef.current = initialSubjectId;
      if (visibleSubjects.some((subject) => subject.id === initialSubjectId)) {
        setSelectedSubjectId(initialSubjectId);
      }
    }
  }, [initialSubjectId, visibleSubjects]);

  // Keep selectedSubjectId valid if visibleSubjects changes
  useEffect(() => {
    if (visibleSubjects.length > 0 && !visibleSubjects.some((subject) => subject.id === selectedSubjectId)) {
      const fallbackId = visibleSubjects[0].id;
      setSelectedSubjectId(fallbackId);
      lastInitialSubjectIdRef.current = fallbackId;
    } else if (visibleSubjects.length === 0 && selectedSubjectId !== '') {
      setSelectedSubjectId('');
      lastInitialSubjectIdRef.current = '';
    }
  }, [visibleSubjects, selectedSubjectId]);

  const currentSubject = useMemo(() => {
    if (visibleSubjects.length === 0) return null;
    return (
      visibleSubjects.find((subject) => subject.id === selectedSubjectId) ||
      visibleSubjects[0] ||
      null
    );
  }, [visibleSubjects, selectedSubjectId]);

  const activeTps = useMemo(
    () =>
      (currentSubject?.tpList || []).filter(
        (tp) => tp.isActive !== false && Boolean(tp.desc && tp.desc.trim())
      ),
    [currentSubject]
  );

  const handleSelectSubject = (newSubjectId: string) => {
    setSelectedSubjectId(newSubjectId);
    lastInitialSubjectIdRef.current = newSubjectId;
    setEditingTpId(null);
    setIsAdding(false);
    setDraftCode('');
    setDraftDescription('');
    onSelectSubject?.(newSubjectId);
  };

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const applyUpdate = async (updatedSubjects: RaporSubject[], message: string) => {
    setSaving(true);
    try {
      await Promise.resolve(onUpdateSubjects(updatedSubjects));
      notify(message);
    } catch (err) {
      console.error(err);
      notify('Gagal menyimpan perubahan ke server.');
    } finally {
      setSaving(false);
    }
  };

  const handleStartAdd = () => {
    if (readOnly) return;
    setEditingTpId(null);
    setDraftCode(`TP ${activeTps.length + 1}`);
    setDraftDescription('');
    setIsAdding(true);
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setDraftCode('');
    setDraftDescription('');
  };

  const handleSaveNewTp = async () => {
    if (!currentSubject || readOnly) return;
    if (!visibleSubjects.some((s) => s.id === currentSubject.id)) return;

    const trimmed = draftDescription.trim();
    if (!trimmed) {
      notify('Deskripsi capaian tidak boleh kosong.');
      return;
    }

    const nextIndex = activeTps.length + 1;
    const newTp: LearningObjective = {
      id: `temp_${Date.now()}`,
      code: draftCode.trim() || `TP ${nextIndex}`,
      desc: trimmed,
      isActive: true,
    };

    const updatedSubjects = subjects.map((subject) =>
      subject.id === currentSubject.id
        ? {
            ...subject,
            tpList: [...subject.tpList, newTp],
          }
        : subject
    );

    setIsAdding(false);
    setDraftCode('');
    setDraftDescription('');
    await applyUpdate(updatedSubjects, 'Tujuan pembelajaran berhasil ditambahkan.');
  };

  const startEdit = (tp: LearningObjective) => {
    if (readOnly) return;
    handleCancelAdd();
    setEditingTpId(tp.id);
    setDraftCode(tp.code || '');
    setDraftDescription(tp.desc);
  };

  const cancelEdit = () => {
    setEditingTpId(null);
    setDraftCode('');
    setDraftDescription('');
  };

  const saveEdit = async (tpId: string) => {
    if (!currentSubject || readOnly) return;
    if (!visibleSubjects.some((s) => s.id === currentSubject.id)) return;

    const trimmed = draftDescription.trim();
    if (!trimmed) {
      notify('Deskripsi capaian tidak boleh kosong.');
      return;
    }

    const updatedSubjects = subjects.map((subject) =>
      subject.id === currentSubject.id
        ? {
            ...subject,
            tpList: subject.tpList.map((tp) =>
              tp.id === tpId
                ? {
                    ...tp,
                    code: draftCode.trim() || tp.code,
                    desc: trimmed,
                  }
                : tp
            ),
          }
        : subject
    );

    await applyUpdate(updatedSubjects, 'Tujuan pembelajaran berhasil disimpan.');
    cancelEdit();
  };

  const deactivateTp = async (tpId: string) => {
    if (!currentSubject || readOnly) return;
    if (!visibleSubjects.some((s) => s.id === currentSubject.id)) return;

    const remainingActive = currentSubject.tpList.filter(
      (tp) => tp.isActive !== false && tp.id !== tpId && Boolean(tp.desc && tp.desc.trim())
    );

    if (remainingActive.length === 0) {
      notify('Minimal harus ada satu TP aktif pada mata pelajaran ini.');
      return;
    }

    const updatedSubjects = subjects.map((subject) =>
      subject.id === currentSubject.id
        ? {
            ...subject,
            tpList: subject.tpList.map((tp) =>
              tp.id === tpId ? { ...tp, isActive: false } : tp
            ),
          }
        : subject
    );

    await applyUpdate(updatedSubjects, 'TP dinonaktifkan. Histori TP tetap aman.');
  };

  const moveTp = async (tpIndex: number, direction: 'up' | 'down') => {
    if (!currentSubject || readOnly) return;
    if (!visibleSubjects.some((s) => s.id === currentSubject.id)) return;

    const targetIndex = direction === 'up' ? tpIndex - 1 : tpIndex + 1;
    if (targetIndex < 0 || targetIndex >= activeTps.length) return;

    const reorderedActive = [...activeTps];
    const temp = reorderedActive[tpIndex];
    reorderedActive[tpIndex] = reorderedActive[targetIndex];
    reorderedActive[targetIndex] = temp;

    const inactiveTps = currentSubject.tpList.filter(
      (tp) => tp.isActive === false && Boolean(tp.desc && tp.desc.trim())
    );
    const reordered = [...reorderedActive, ...inactiveTps];

    const updatedSubjects = subjects.map((subject) =>
      subject.id === currentSubject.id ? { ...subject, tpList: reordered } : subject
    );

    await applyUpdate(updatedSubjects, 'Urutan tujuan pembelajaran berhasil diperbarui.');
  };

  const currentMeta = currentSubject ? getSubjectMeta(currentSubject.name, currentSubject.category) : null;
  const CurrentIcon = currentMeta?.icon || BookOpen;

  return (
    <div className="space-y-4">
      {notification && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.12] px-4 py-2.5 text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          {notification}
        </div>
      )}

      {subjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.10] bg-[#07111E] p-12 text-center">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="mt-4 text-base font-black text-white">Belum ada Mapel Aktif</h3>
          <p className="mt-2 max-w-md mx-auto text-xs leading-relaxed text-slate-400">
            Belum ada master mata pelajaran aktif untuk jenjang Kelas {gradeLevel}.
          </p>
        </div>
      ) : visibleSubjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-400/20 bg-amber-400/[0.03] p-12 text-center">
          <BookOpen className="w-10 h-10 text-amber-400/60 mx-auto" />
          <h3 className="mt-4 text-base font-black text-white">
            Belum ada Mapel yang ditugaskan untuk konteks ini
          </h3>
          <p className="mt-2 max-w-md mx-auto text-xs leading-relaxed text-slate-400">
            Anda tidak memiliki penugasan mata pelajaran aktif pada Kelas {classLevel}.
          </p>
        </div>
      ) : (
        /* ============================================================
           2-COLUMN EXECUTIVE SPLIT VIEW (EXACTLY MATCHING REFERENCE)
        ============================================================ */
        <div className="grid grid-cols-1 lg:grid-cols-[330px_1fr] xl:grid-cols-[360px_1fr] gap-4 items-start">
          
          {/* ============================================================
             LEFT COLUMN: DAFTAR MATA PELAJARAN (SIDEBAR)
          ============================================================ */}
          <aside className="rounded-2xl border border-white/[0.08] bg-[#07111E] p-4 shadow-xl shadow-black/20 flex flex-col gap-3.5">
            <div>
              <h3 className="text-sm font-black text-white tracking-tight">Daftar Mata Pelajaran</h3>
            </div>

            {/* Instant Search Bar */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari mata pelajaran..."
                className="w-full h-9 pl-3.5 pr-9 rounded-xl border border-white/[0.08] bg-[#0A1626] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/40 focus:ring-1 focus:ring-emerald-400/25 transition-all"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>

            {/* Subject List */}
            <div className="space-y-2 max-h-[calc(100vh-20rem)] overflow-y-auto custom-scrollbar pr-0.5">
              {filteredSubjects.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  Tidak ada mata pelajaran yang cocok.
                </div>
              ) : (
                filteredSubjects.map((subj) => {
                  const isSelected = subj.id === selectedSubjectId;
                  const meta = getSubjectMeta(subj.name, subj.category);
                  const Icon = meta.icon;
                  const tpCount = (subj.tpList || []).filter(
                    (tp) => tp.isActive !== false && Boolean(tp.desc && tp.desc.trim())
                  ).length;

                  return (
                    <button
                      key={subj.id}
                      type="button"
                      onClick={() => handleSelectSubject(subj.id)}
                      className={`w-full text-left rounded-xl p-3 flex items-center justify-between gap-2.5 transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-2 border-emerald-400 bg-emerald-950/30 shadow-[0_0_20px_rgba(16,185,129,0.14)]'
                          : 'border border-white/[0.07] bg-[#0A1626] hover:bg-[#0D1C30] hover:border-white/[0.14]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Subject Icon Box */}
                        <div
                          className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                              : 'bg-white/[0.04] text-slate-400 border border-white/[0.06]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        {/* Subject Name & Category Badge */}
                        <div className="min-w-0">
                          <p className={`text-xs font-black truncate leading-tight ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                            {subj.name}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full border text-[8.5px] font-black uppercase tracking-wider ${meta.categoryClass}`}>
                              {meta.categoryLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* TP Count Badge */}
                      <span className="shrink-0 text-[11px] font-extrabold text-slate-300 whitespace-nowrap pl-1">
                        {tpCount} TP
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* ============================================================
             RIGHT COLUMN: ACTIVE SUBJECT DETAIL & TP MANAGEMENT
          ============================================================ */}
          <section className="space-y-4">
            {currentSubject ? (
              <>
                {/* 1. TOP HEADER BANNER OF SELECTED SUBJECT */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#07111E] p-4 sm:p-5 shadow-xl shadow-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
                      <CurrentIcon className="w-6 h-6" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
                        {currentSubject.name}
                      </h2>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${currentMeta?.categoryClass}`}>
                          {currentMeta?.categoryLabel}
                        </span>
                        {currentSubject.code && (
                          <span className="font-mono text-[9.5px] font-bold text-slate-400">
                            {currentSubject.code}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs text-slate-400 leading-relaxed max-w-xl">
                        {currentMeta?.defaultDesc}
                      </p>
                    </div>
                  </div>

                  {/* Right Status Badge: 8 TP Aktif dari 8 TP + More Button */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <div className="rounded-xl border border-white/[0.08] bg-slate-950/70 px-3.5 py-2 text-right">
                      <p className="text-xs font-black text-white leading-tight">
                        {activeTps.length} TP Aktif
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        dari {(currentSubject.tpList || []).length} TP
                      </p>
                    </div>

                    <button
                      type="button"
                      title="Opsi Mata Pelajaran"
                      className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. TP SECTION HEADER & ACTIONS */}
                <div className="flex items-center justify-between gap-3 px-1">
                  <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                    Tujuan Pembelajaran (TP)
                  </h3>

                  <div className="flex items-center gap-2">
                    {activeTps.length > 1 && !readOnly && (
                      <button
                        type="button"
                        onClick={() => setIsReorderMode(!isReorderMode)}
                        className={`h-8 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isReorderMode
                            ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                            : 'border-white/[0.09] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300'
                        }`}
                      >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        <span>Urutkan</span>
                      </button>
                    )}

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={handleStartAdd}
                        disabled={saving || isAdding}
                        className="h-8 sm:h-8.5 px-3.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>Tambah TP</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. INLINE ADD TP FORM */}
                {isAdding && (
                  <div className="rounded-2xl border border-emerald-400/40 bg-[#07111E] p-4 shadow-xl space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.07]">
                      <p className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                        <Plus className="w-4 h-4" /> Tambah Tujuan Pembelajaran Baru
                      </p>
                      <button
                        type="button"
                        onClick={handleCancelAdd}
                        className="text-slate-400 hover:text-white p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                          Nomor / Kode TP
                        </label>
                        <input
                          type="text"
                          value={draftCode}
                          onChange={(e) => setDraftCode(e.target.value)}
                          placeholder={`TP ${activeTps.length + 1}`}
                          className="w-full h-9 rounded-xl border border-white/[0.1] bg-slate-950 px-3 text-xs text-white focus:border-emerald-400 focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                          Deskripsi Capaian Kompetensi <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={draftDescription}
                          onChange={(e) => setDraftDescription(e.target.value)}
                          placeholder="contoh: Membaca dan melafalkan surah-surah pendek dengan tartil."
                          className="w-full h-9 rounded-xl border border-white/[0.1] bg-slate-950 px-3 text-xs text-white focus:border-emerald-400 focus:outline-none"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                      <button
                        type="button"
                        onClick={handleCancelAdd}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNewTp}
                        disabled={saving}
                        className="px-4 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-400/20 disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Simpan TP
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. TP LIST ROWS */}
                {activeTps.length === 0 && !isAdding ? (
                  <div className="p-10 rounded-2xl border border-dashed border-white/[0.08] bg-[#07111E] text-center">
                    <p className="text-xs text-slate-400">Belum ada Tujuan Pembelajaran aktif pada mata pelajaran ini.</p>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={handleStartAdd}
                        className="mt-3 px-4 py-2 rounded-xl bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold cursor-pointer transition-all inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah TP Pertama
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activeTps.map((tp, index) => {
                      const isEditing = editingTpId === tp.id;

                      return (
                        <div
                          key={tp.id}
                          className="group rounded-xl border border-white/[0.07] bg-[#07111E] p-3 sm:px-4 sm:py-3.5 shadow-md hover:border-white/[0.14] transition-all duration-150"
                        >
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                <div className="sm:col-span-1">
                                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                    Nomor / Kode
                                  </label>
                                  <input
                                    type="text"
                                    value={draftCode}
                                    onChange={(e) => setDraftCode(e.target.value)}
                                    placeholder="TP 1"
                                    className="w-full h-9 rounded-xl border border-white/[0.1] bg-slate-950 px-3 text-xs text-white focus:border-emerald-400 focus:outline-none"
                                  />
                                </div>
                                <div className="sm:col-span-3">
                                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                    Deskripsi Capaian
                                  </label>
                                  <input
                                    type="text"
                                    value={draftDescription}
                                    onChange={(e) => setDraftDescription(e.target.value)}
                                    placeholder="Deskripsi capaian..."
                                    className="w-full h-9 rounded-xl border border-white/[0.1] bg-slate-950 px-3 text-xs text-white focus:border-emerald-400 focus:outline-none"
                                    autoFocus
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.05]">
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  onClick={() => saveEdit(tp.id)}
                                  disabled={saving}
                                  className="px-4 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-emerald-400/20 disabled:opacity-50"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  Simpan
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-3">
                              {/* Left: Drag Dots + Number Badge + Description */}
                              <div className="flex items-center gap-3 min-w-0">
                                <GripVertical className="w-4 h-4 text-slate-600 shrink-0 select-none" />

                                {/* Number Badge */}
                                <div className="w-7 h-7 rounded-lg bg-[#0A1626] border border-white/[0.08] flex items-center justify-center text-xs font-black text-emerald-300 shrink-0 shadow-inner">
                                  {index + 1}
                                </div>

                                {/* TP Description Text */}
                                <div className="min-w-0">
                                  <p className="text-xs sm:text-[13px] text-slate-200 font-medium leading-relaxed">
                                    {tp.desc}
                                  </p>
                                </div>
                              </div>

                              {/* Right: Active Status Pill + Edit + Trash Icons */}
                              <div className="flex items-center gap-3 shrink-0 pl-2">
                                {/* Status Pill */}
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                  <span className="text-[10px] font-bold text-emerald-300">Aktif</span>
                                </div>

                                {/* Reorder Buttons when active */}
                                {isReorderMode && !readOnly && (
                                  <div className="flex items-center gap-0.5 border-l border-white/[0.08] pl-2">
                                    <button
                                      type="button"
                                      onClick={() => moveTp(index, 'up')}
                                      disabled={index === 0 || saving}
                                      title="Pindahkan ke atas"
                                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-20 cursor-pointer"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveTp(index, 'down')}
                                      disabled={index === activeTps.length - 1 || saving}
                                      title="Pindahkan ke bawah"
                                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-20 cursor-pointer"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}

                                {/* Action Buttons */}
                                {!readOnly && (
                                  <div className="flex items-center gap-1 border-l border-white/[0.08] pl-2">
                                    <button
                                      type="button"
                                      onClick={() => startEdit(tp)}
                                      title="Edit TP"
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deactivateTp(tp.id)}
                                      title="Nonaktifkan TP"
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/[0.1] transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
};
