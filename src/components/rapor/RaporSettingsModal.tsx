import React, { useState, useEffect } from 'react';
import {
  X,
  School,
  UserCheck,
  Check,
  Save,
  Lock,
  HeartHandshake,
  RotateCcw,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  RaporStsConfig,
  TeacherProfile,
  DEFAULT_CLASS_TEACHERS,
  CharacterDescriptor,
  DEFAULT_CHARACTER_DESCRIPTORS,
} from '../../types/raporSts';

interface RaporSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: RaporStsConfig;
  activeClass: string;
  gradeLevel: string;
  onSaveConfig: (newConfig: Partial<RaporStsConfig>) => void;
  initialTab?: 'general' | 'teachers' | 'characters';
  isAdmin?: boolean;
  descriptors?: CharacterDescriptor[];
  onSaveDescriptors?: (descriptors: CharacterDescriptor[]) => Promise<void> | void;
}

const CLASS_LIST = [
  '1A', '1B', '2A', '2B', '2C', '3A', '3B', '3C',
  '4A', '4B', '5A', '5B', '6A', '6B',
];

export const RaporSettingsModal: React.FC<RaporSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  activeClass,
  onSaveConfig,
  isAdmin,
  descriptors,
  onSaveDescriptors,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'teachers' | 'characters'>('general');

  // Form State for General Config
  const [localConfig, setLocalConfig] = useState<RaporStsConfig>(config);
  const [classTeachers, setClassTeachers] = useState<Record<string, TeacherProfile>>(() => {
    return config.classTeachers && Object.keys(config.classTeachers).length > 0
      ? { ...DEFAULT_CLASS_TEACHERS, ...config.classTeachers }
      : { ...DEFAULT_CLASS_TEACHERS };
  });

  // Character Descriptors State
  const [localDescriptors, setLocalDescriptors] = useState<CharacterDescriptor[]>(() => {
    return descriptors && descriptors.length > 0
      ? descriptors
      : DEFAULT_CHARACTER_DESCRIPTORS;
  });
  const [characterSearch, setCharacterSearch] = useState('');
  const [expandedCharId, setExpandedCharId] = useState<string | null>(null);
  const [isSavingChar, setIsSavingChar] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalConfig(config);
      setClassTeachers(
        config.classTeachers && Object.keys(config.classTeachers).length > 0
          ? { ...DEFAULT_CLASS_TEACHERS, ...config.classTeachers }
          : { ...DEFAULT_CLASS_TEACHERS }
      );
      if (descriptors && descriptors.length > 0) {
        setLocalDescriptors(descriptors);
      }
    }
  }, [isOpen, config, descriptors]);

  const handleUpdateWalas = (cls: string, field: 'name' | 'nip', value: string) => {
    setClassTeachers((prev) => ({
      ...prev,
      [cls]: {
        ...(prev[cls] || { name: '', nip: '' }),
        [field]: value,
      },
    }));
  };

  if (!isOpen) return null;

  // Security Guard: Hanya Admin yang berhak mengakses pengaturan rapor
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Akses Khusus Admin</h3>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Pengaturan kop sekolah, titimangsa, wali kelas, dan master 18 karakter hanya dapat dikelola oleh Administrator.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  // Handle General Config Submission
  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    const activeWalas = classTeachers[activeClass] || {
      name: localConfig.teacherName,
      nip: localConfig.teacherNip,
    };

    const finalConfig: Partial<RaporStsConfig> = {
      ...localConfig,
      teacherName: activeWalas.name || localConfig.teacherName,
      teacherNip: activeWalas.nip || localConfig.teacherNip,
      classTeachers,
    };

    onSaveConfig(finalConfig);
    setNotification('Pengaturan data umum dan wali kelas berhasil disimpan.');
    setTimeout(() => {
      setNotification(null);
    }, 1500);
  };

  // Handle Character Descriptors Save
  const handleSaveCharacters = async () => {
    setIsSavingChar(true);
    try {
      if (onSaveDescriptors) {
        await onSaveDescriptors(localDescriptors);
      }
      setNotification('Master 18 Aspek Karakter & Indikator berhasil disimpan.');
      setTimeout(() => setNotification(null), 2000);
    } catch (err) {
      console.error('Error saving character descriptors:', err);
    } finally {
      setIsSavingChar(false);
    }
  };

  const handleResetCharactersToDefault = () => {
    if (window.confirm('Kembalikan seluruh 18 aspek karakter dan deskripsi indikator ke standar kurikulum?')) {
      setLocalDescriptors(DEFAULT_CHARACTER_DESCRIPTORS);
      setNotification('Berhasil mereset karakter ke standar bawaan. Klik "Simpan Karakter" untuk menetapkannya.');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleUpdateDescriptorName = (id: string, newName: string) => {
    setLocalDescriptors((prev) =>
      prev.map((d) => (d.id === id ? { ...d, name: newName } : d))
    );
  };

  const handleUpdateIndicator = (id: string, pred: 'A' | 'B' | 'C' | 'D', text: string) => {
    setLocalDescriptors((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              indicators: {
                ...d.indicators,
                [pred]: text,
              },
            }
          : d
      )
    );
  };

  const filteredDescriptors = localDescriptors.filter((d) => {
    if (!characterSearch.trim()) return true;
    const q = characterSearch.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      Object.values(d.indicators).some((txt) => txt.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center font-bold">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Pengaturan Format & Administrasi Rapor</h3>
              <p className="text-[11px] text-slate-400">
                Konfigurasi kop sekolah, titimangsa rapor, wali kelas, dan master 18 karakter siswa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tab Navigator */}
        <div className="px-5 pt-3 border-b border-slate-800/80 bg-slate-950/40 flex items-center gap-2 overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'general'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <School className="w-3.5 h-3.5" />
            <span>Identitas Sekolah & Titimangsa</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teachers')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'teachers'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Daftar Wali Kelas Rombel</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('characters')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'characters'
                ? 'border-sky-400 text-sky-300 bg-sky-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Master 18 Karakter & Indikator</span>
          </button>
        </div>

        {notification && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{notification}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {/* TAB 1: IDENTITAS SEKOLAH & TITIMANGSA */}
          {activeTab === 'general' && (
            <form id="general-config-form" onSubmit={handleSaveGeneral} className="space-y-4">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5" />
                  <span>Identitas Sekolah & Titimangsa</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Nama Sekolah</label>
                    <input
                      type="text"
                      value={localConfig.schoolName}
                      onChange={(e) => setLocalConfig({ ...localConfig, schoolName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">NPSN</label>
                    <input
                      type="text"
                      value={localConfig.npsn}
                      onChange={(e) => setLocalConfig({ ...localConfig, npsn: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-semibold text-slate-300">Alamat Sekolah</label>
                    <input
                      type="text"
                      value={localConfig.schoolAddress}
                      onChange={(e) => setLocalConfig({ ...localConfig, schoolAddress: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Nama Kepala Sekolah</label>
                    <input
                      type="text"
                      value={localConfig.headmasterName}
                      onChange={(e) => setLocalConfig({ ...localConfig, headmasterName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">NIP Kepala Sekolah</label>
                    <input
                      type="text"
                      value={localConfig.headmasterNip}
                      onChange={(e) => setLocalConfig({ ...localConfig, headmasterNip: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Tempat & Tanggal Titimangsa Rapor</label>
                    <input
                      type="text"
                      value={localConfig.reportDatePlace}
                      placeholder="Depok, 20 Maret 2025"
                      onChange={(e) => setLocalConfig({ ...localConfig, reportDatePlace: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">KKTP / Passing Grade Minimal</label>
                    <input
                      type="number"
                      value={localConfig.passingGrade}
                      onChange={(e) => setLocalConfig({ ...localConfig, passingGrade: parseInt(e.target.value, 10) || 75 })}
                      className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Identitas</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: DAFTAR WALI KELAS ROMBEL */}
          {activeTab === 'teachers' && (
            <form onSubmit={handleSaveGeneral} className="space-y-4">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Daftar Wali Kelas & NIP per Rombel</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Otomatis tercetak di rapor sesuai kelas siswa
                  </span>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="py-2 px-3 font-bold w-16 text-center">Kelas</th>
                          <th className="py-2 px-3 font-bold">Nama Wali Kelas (Beserta Gelar)</th>
                          <th className="py-2 px-3 font-bold">NIP / NUPTK</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {CLASS_LIST.map((cls) => {
                          const isActiveClass = cls === activeClass;
                          const teacher = classTeachers[cls] || { name: '', nip: '' };
                          return (
                            <tr
                              key={cls}
                              className={`transition-colors ${
                                isActiveClass ? 'bg-amber-500/10' : 'hover:bg-slate-900/40'
                              }`}
                            >
                              <td className="py-1.5 px-3 text-center font-black">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                                    isActiveClass
                                      ? 'bg-amber-500 text-slate-950 font-bold'
                                      : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  {cls}
                                </span>
                              </td>
                              <td className="py-1.5 px-3">
                                <input
                                  type="text"
                                  placeholder={`Nama Walas ${cls}`}
                                  value={teacher.name}
                                  onChange={(e) => handleUpdateWalas(cls, 'name', e.target.value)}
                                  className="w-full bg-slate-900/80 border border-slate-700/80 px-2 py-1 rounded text-white text-xs focus:outline-none focus:border-amber-400"
                                />
                              </td>
                              <td className="py-1.5 px-3">
                                <input
                                  type="text"
                                  placeholder="NIP / - "
                                  value={teacher.nip}
                                  onChange={(e) => handleUpdateWalas(cls, 'nip', e.target.value)}
                                  className="w-full bg-slate-900/80 border border-slate-700/80 px-2 py-1 rounded text-white text-xs focus:outline-none focus:border-amber-400"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Wali Kelas</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: MASTER 18 KARAKTER & INDIKATOR */}
          {activeTab === 'characters' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    <HeartHandshake className="w-3.5 h-3.5" />
                    <span>Konfigurasi Master 18 Karakter Peserta Didik</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Admin dapat merumuskan kalimat indikator per predikat (A, B, C, D) yang otomatis dipakai guru saat memilih predikat.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetCharactersToDefault}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    title="Reset seluruh karakter ke format standar kurikulum"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-400" />
                    <span>Reset Default</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveCharacters}
                    disabled={isSavingChar}
                    className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingChar ? 'Menyimpan...' : 'Simpan Karakter'}</span>
                  </button>
                </div>
              </div>

              {/* Search Bar for Karakter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari aspek karakter atau narasi indikator..."
                  value={characterSearch}
                  onChange={(e) => setCharacterSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>

              {/* Descriptors List */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                {filteredDescriptors.map((desc, idx) => {
                  const isExpanded = expandedCharId === desc.id || filteredDescriptors.length <= 2;
                  return (
                    <div
                      key={desc.id}
                      className="border border-slate-800 rounded-xl bg-slate-950/70 overflow-hidden transition-all"
                    >
                      {/* Character Card Header */}
                      <div
                        onClick={() => setExpandedCharId(isExpanded ? null : desc.id)}
                        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-900/70 select-none"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-sky-500/15 text-sky-400 text-xs font-bold flex items-center justify-center border border-sky-500/25">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-white tracking-wide">
                            {desc.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 hidden sm:inline">
                            A, B, C, D terdefinisi
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Character Card Body (Editable indicators) */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 bg-slate-900/30 space-y-3 text-xs">
                          {/* Nama Karakter Field */}
                          <div>
                            <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                              Nama Aspek Karakter
                            </label>
                            <input
                              type="text"
                              value={desc.name}
                              onChange={(e) => handleUpdateDescriptorName(desc.id, e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700/80 px-3 py-1.5 rounded-lg text-white font-medium focus:outline-none focus:border-sky-400"
                            />
                          </div>

                          {/* 4 Predicates Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            {/* [A] Sangat Baik */}
                            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-2.5 space-y-1">
                              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                                <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-300 inline-flex items-center justify-center text-[10px]">A</span>
                                <span>Predikat A — Sangat Baik</span>
                              </span>
                              <textarea
                                rows={3}
                                value={desc.indicators.A}
                                onChange={(e) => handleUpdateIndicator(desc.id, 'A', e.target.value)}
                                className="w-full bg-slate-950 border border-emerald-500/20 px-2.5 py-1.5 rounded text-white text-[11px] leading-relaxed focus:outline-none focus:border-emerald-400 custom-scrollbar resize-none"
                              />
                            </div>

                            {/* [B] Baik */}
                            <div className="bg-sky-950/20 border border-sky-500/30 rounded-lg p-2.5 space-y-1">
                              <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1">
                                <span className="w-4 h-4 rounded bg-sky-500/20 text-sky-300 inline-flex items-center justify-center text-[10px]">B</span>
                                <span>Predikat B — Baik</span>
                              </span>
                              <textarea
                                rows={3}
                                value={desc.indicators.B}
                                onChange={(e) => handleUpdateIndicator(desc.id, 'B', e.target.value)}
                                className="w-full bg-slate-950 border border-sky-500/20 px-2.5 py-1.5 rounded text-white text-[11px] leading-relaxed focus:outline-none focus:border-sky-400 custom-scrollbar resize-none"
                              />
                            </div>

                            {/* [C] Cukup */}
                            <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-2.5 space-y-1">
                              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                                <span className="w-4 h-4 rounded bg-amber-500/20 text-amber-300 inline-flex items-center justify-center text-[10px]">C</span>
                                <span>Predikat C — Cukup</span>
                              </span>
                              <textarea
                                rows={3}
                                value={desc.indicators.C}
                                onChange={(e) => handleUpdateIndicator(desc.id, 'C', e.target.value)}
                                className="w-full bg-slate-950 border border-amber-500/20 px-2.5 py-1.5 rounded text-white text-[11px] leading-relaxed focus:outline-none focus:border-amber-400 custom-scrollbar resize-none"
                              />
                            </div>

                            {/* [D] Perlu Bimbingan */}
                            <div className="bg-rose-950/20 border border-rose-500/30 rounded-lg p-2.5 space-y-1">
                              <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                                <span className="w-4 h-4 rounded bg-rose-500/20 text-rose-300 inline-flex items-center justify-center text-[10px]">D</span>
                                <span>Predikat D — Perlu Bimbingan</span>
                              </span>
                              <textarea
                                rows={3}
                                value={desc.indicators.D}
                                onChange={(e) => handleUpdateIndicator(desc.id, 'D', e.target.value)}
                                className="w-full bg-slate-950 border border-rose-500/20 px-2.5 py-1.5 rounded text-white text-[11px] leading-relaxed focus:outline-none focus:border-rose-400 custom-scrollbar resize-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Actions for Characters Tab */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleSaveCharacters}
                  disabled={isSavingChar}
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingChar ? 'Menyimpan...' : 'Simpan Master 18 Karakter'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
