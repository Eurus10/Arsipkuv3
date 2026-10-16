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
  Database,
  Copy,
  CheckCheck,
  ShieldCheck,
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
  initialTab?: 'general' | 'teachers' | 'characters' | 'database';
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
  initialTab = 'general',
  isAdmin,
  descriptors,
  onSaveDescriptors,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'teachers' | 'characters' | 'database'>(initialTab);
  const [copiedSql, setCopiedSql] = useState(false);

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full text-center shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">Akses Khusus Admin</h3>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Pengaturan kop sekolah, titimangsa, wali kelas, dan master 18 karakter hanya dapat dikelola oleh Administrator.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pengaturan Format & Administrasi Rapor</h3>
              <p className="text-[11px] text-slate-500">
                Konfigurasi kop sekolah, titimangsa rapor, wali kelas, dan master 18 karakter siswa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tab Navigator */}
        <div className="px-5 pt-3 border-b border-slate-200 bg-slate-50/50 flex items-center gap-2 overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'general'
                ? 'border-amber-500 text-amber-700 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
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
                ? 'border-emerald-500 text-emerald-700 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
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
                ? 'border-sky-500 text-sky-700 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Master 18 Karakter & Indikator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'database'
                ? 'border-teal-500 text-teal-700 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Database Cloud & SQL</span>
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
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5" />
                  <span>Identitas Sekolah & Titimangsa</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Nama Sekolah</label>
                    <input
                      type="text"
                      value={localConfig.schoolName}
                      onChange={(e) => setLocalConfig({ ...localConfig, schoolName: e.target.value })}
                      className="w-full bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">NPSN</label>
                    <input
                      type="text"
                      value={localConfig.npsn}
                      onChange={(e) => setLocalConfig({ ...localConfig, npsn: e.target.value })}
                      className="w-full bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-semibold text-slate-700">Alamat Sekolah</label>
                    <input
                      type="text"
                      value={localConfig.schoolAddress}
                      onChange={(e) => setLocalConfig({ ...localConfig, schoolAddress: e.target.value })}
                      className="w-full bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Nama Kepala Sekolah</label>
                    <input
                      type="text"
                      value={localConfig.headmasterName}
                      onChange={(e) => setLocalConfig({ ...localConfig, headmasterName: e.target.value })}
                      className="w-full bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">NIP Kepala Sekolah</label>
                    <input
                      type="text"
                      value={localConfig.headmasterNip}
                      onChange={(e) => setLocalConfig({ ...localConfig, headmasterNip: e.target.value })}
                      className="w-full bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Tempat & Tanggal Titimangsa Rapor</label>
                    <input
                      type="text"
                      value={localConfig.reportDatePlace}
                      placeholder="Depok, 20 Maret 2025"
                      onChange={(e) => setLocalConfig({ ...localConfig, reportDatePlace: e.target.value })}
                      className="w-full bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">KKTP / Passing Grade Minimal</label>
                    <input
                      type="number"
                      value={localConfig.passingGrade}
                      onChange={(e) => setLocalConfig({ ...localConfig, passingGrade: parseInt(e.target.value, 10) || 75 })}
                      className="w-full bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
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
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Daftar Wali Kelas & NIP per Rombel</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Otomatis tercetak di rapor sesuai kelas siswa
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3 font-bold w-16 text-center">Kelas</th>
                          <th className="py-2.5 px-3 font-bold">Nama Wali Kelas (Beserta Gelar)</th>
                          <th className="py-2.5 px-3 font-bold">NIP / NUPTK</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {CLASS_LIST.map((cls) => {
                          const isActiveClass = cls === activeClass;
                          const teacher = classTeachers[cls] || { name: '', nip: '' };
                          return (
                            <tr
                              key={cls}
                              className={`transition-colors ${
                                isActiveClass ? 'bg-emerald-50/60' : 'hover:bg-slate-50/80'
                              }`}
                            >
                              <td className="py-2 px-3 text-center font-black">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                    isActiveClass
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {cls}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  placeholder={`Nama Walas ${cls}`}
                                  value={teacher.name}
                                  onChange={(e) => handleUpdateWalas(cls, 'name', e.target.value)}
                                  className="w-full bg-white border border-slate-300 px-2.5 py-1.5 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-emerald-500 shadow-xs"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  placeholder="NIP / - "
                                  value={teacher.nip}
                                  onChange={(e) => handleUpdateWalas(cls, 'nip', e.target.value)}
                                  className="w-full bg-white border border-slate-300 px-2.5 py-1.5 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-emerald-500 shadow-xs"
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

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1.5">
                    <HeartHandshake className="w-3.5 h-3.5" />
                    <span>Konfigurasi Master 18 Karakter Peserta Didik</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Admin dapat merumuskan kalimat indikator per predikat (A, B, C, D) yang otomatis dipakai guru saat memilih predikat.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetCharactersToDefault}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Reset seluruh karakter ke format standar kurikulum"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-500" />
                    <span>Reset Default</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveCharacters}
                    disabled={isSavingChar}
                    className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
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
                  className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-xs"
                />
              </div>

              {/* Descriptors List */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                {filteredDescriptors.map((desc, idx) => {
                  const isExpanded = expandedCharId === desc.id || filteredDescriptors.length <= 2;
                  return (
                    <div
                      key={desc.id}
                      className="border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden transition-all"
                    >
                      {/* Character Card Header */}
                      <div
                        onClick={() => setExpandedCharId(isExpanded ? null : desc.id)}
                        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 select-none"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-sky-50 text-sky-700 text-xs font-bold flex items-center justify-center border border-sky-200">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-800 tracking-wide">
                            {desc.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 hidden sm:inline">
                            A, B, C, D terdefinisi
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                      </div>

                      {/* Character Card Body (Editable indicators) */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-3 text-xs">
                          {/* Nama Karakter Field */}
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                              Nama Aspek Karakter
                            </label>
                            <input
                              type="text"
                              value={desc.name}
                              onChange={(e) => handleUpdateDescriptorName(desc.id, e.target.value)}
                              className="w-full bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-slate-900 font-medium focus:outline-none focus:border-sky-500 shadow-xs"
                            />
                          </div>

                          {/* 4 Predicates Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            {/* [A] Sangat Baik */}
                            <div className="bg-emerald-50/40 border border-emerald-200 rounded-lg p-2.5 space-y-1">
                              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                <span className="w-4 h-4 rounded bg-emerald-100 text-emerald-800 inline-flex items-center justify-center text-[10px] font-bold">A</span>
                                <span>Predikat A — Sangat Baik</span>
                              </span>
                              <textarea
                                rows={3}
                                value={desc.indicators.A}
                                onChange={(e) => handleUpdateIndicator(desc.id, 'A', e.target.value)}
                                className="w-full bg-white border border-emerald-300 px-2.5 py-1.5 rounded-lg text-slate-900 text-[11px] leading-relaxed focus:outline-none focus:border-emerald-500 custom-scrollbar resize-none shadow-xs"
                              />
                            </div>

                            {/* [B] Baik */}
                            <div className="bg-sky-50/40 border border-sky-200 rounded-lg p-2.5 space-y-1">
                              <span className="text-[11px] font-bold text-sky-700 flex items-center gap-1">
                                <span className="w-4 h-4 rounded bg-sky-100 text-sky-800 inline-flex items-center justify-center text-[10px] font-bold">B</span>
                                <span>Predikat B — Baik</span>
                              </span>
                              <textarea
                                rows={3}
                                value={desc.indicators.B}
                                onChange={(e) => handleUpdateIndicator(desc.id, 'B', e.target.value)}
                                className="w-full bg-white border border-sky-300 px-2.5 py-1.5 rounded-lg text-slate-900 text-[11px] leading-relaxed focus:outline-none focus:border-sky-500 custom-scrollbar resize-none shadow-xs"
                              />
                            </div>

                            {/* [C] Cukup */}
                            <div className="bg-amber-50/40 border border-amber-200 rounded-lg p-2.5 space-y-1">
                              <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                                <span className="w-4 h-4 rounded bg-amber-100 text-amber-800 inline-flex items-center justify-center text-[10px] font-bold">C</span>
                                <span>Predikat C — Cukup</span>
                              </span>
                              <textarea
                                rows={3}
                                value={desc.indicators.C}
                                onChange={(e) => handleUpdateIndicator(desc.id, 'C', e.target.value)}
                                className="w-full bg-white border border-amber-300 px-2.5 py-1.5 rounded-lg text-slate-900 text-[11px] leading-relaxed focus:outline-none focus:border-amber-500 custom-scrollbar resize-none shadow-xs"
                              />
                            </div>

                            {/* [D] Perlu Bimbingan */}
                            <div className="bg-rose-50/40 border border-rose-200 rounded-lg p-2.5 space-y-1">
                              <span className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                                <span className="w-4 h-4 rounded bg-rose-100 text-rose-800 inline-flex items-center justify-center text-[10px] font-bold">D</span>
                                <span>Predikat D — Perlu Bimbingan</span>
                              </span>
                              <textarea
                                rows={3}
                                value={desc.indicators.D}
                                onChange={(e) => handleUpdateIndicator(desc.id, 'D', e.target.value)}
                                className="w-full bg-white border border-rose-300 px-2.5 py-1.5 rounded-lg text-slate-900 text-[11px] leading-relaxed focus:outline-none focus:border-rose-500 custom-scrollbar resize-none shadow-xs"
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
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleSaveCharacters}
                  disabled={isSavingChar}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingChar ? 'Menyimpan...' : 'Simpan Master 18 Karakter'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: DATABASE CLOUD & SQL */}
          {activeTab === 'database' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-teal-900">Sinkronisasi Cloud Aktif (Dual Cloud Engine)</h4>
                  <p className="text-[11px] text-teal-800 leading-relaxed">
                    Setiap catatan guru, absensi, dan ekstrakurikuler kini disimpan secara terpusat dan otomatis tersinkronisasi ke <strong>Cloud Supabase</strong> dan <strong>Cloud Firestore</strong>. Guru dapat mengerjakan rapor di laptop masing-masing tanpa khawatir catatan hilang saat reload atau ganti perangkat, dan Admin dapat langsung menarik data catatan ini saat cetak rapor dan leger.
                  </p>
                </div>
              </div>

              {/* Migration 012 Box */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700">
                      Skema Database Supabase
                    </span>
                    <h5 className="text-xs font-bold text-slate-900">
                      Migration 012: Tabel Catatan Guru, Absensi & Ekstrakurikuler
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tabel <code className="bg-slate-200 px-1 py-0.5 rounded text-teal-800 font-mono">student_additional_info</code> untuk persistensi data catatan rapor.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const sql = `-- MIGRATION 012: CATATAN GURU, ABSENSI & EKSTRAKURIKULER
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.student_additional_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_period_id UUID NOT NULL REFERENCES public.academic_periods(id) ON UPDATE CASCADE ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES public.school_classes(id) ON UPDATE CASCADE ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE,
    teacher_id TEXT NULL REFERENCES public.teachers(id) ON UPDATE CASCADE ON DELETE SET NULL,
    teacher_notes TEXT NULL,
    sakit INTEGER NOT NULL DEFAULT 0,
    izin INTEGER NOT NULL DEFAULT 0,
    alpha INTEGER NOT NULL DEFAULT 0,
    extracurriculars JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_additional_info UNIQUE (academic_period_id, class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_additional_info_lookup ON public.student_additional_info (academic_period_id, class_id);
CREATE INDEX IF NOT EXISTS idx_student_additional_info_student ON public.student_additional_info (student_id);

ALTER TABLE public.student_additional_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all read on student_additional_info" ON public.student_additional_info;
CREATE POLICY "Allow all read on student_additional_info" ON public.student_additional_info FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all write on student_additional_info" ON public.student_additional_info;
CREATE POLICY "Allow all write on student_additional_info" ON public.student_additional_info FOR ALL USING (true) WITH CHECK (true);`;

                      navigator.clipboard.writeText(sql);
                      setCopiedSql(true);
                      setNotification('Script SQL Migration 012 berhasil disalin ke clipboard!');
                      setTimeout(() => setCopiedSql(false), 3000);
                      setTimeout(() => setNotification(null), 3000);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 self-start sm:self-auto shadow-xs"
                  >
                    {copiedSql ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Script SQL Supabase</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-200 max-h-48 overflow-y-auto custom-scrollbar shadow-inner">
                  <pre className="whitespace-pre-wrap leading-relaxed">
{`-- MIGRATION 012: CATATAN GURU, ABSENSI & EKSTRAKURIKULER
CREATE TABLE IF NOT EXISTS public.student_additional_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_period_id UUID NOT NULL REFERENCES public.academic_periods(id) ON UPDATE CASCADE ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES public.school_classes(id) ON UPDATE CASCADE ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE,
    teacher_id TEXT NULL REFERENCES public.teachers(id) ON UPDATE CASCADE ON DELETE SET NULL,
    teacher_notes TEXT NULL,
    sakit INTEGER NOT NULL DEFAULT 0,
    izin INTEGER NOT NULL DEFAULT 0,
    alpha INTEGER NOT NULL DEFAULT 0,
    extracurriculars JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_additional_info UNIQUE (academic_period_id, class_id, student_id)
);`}
                  </pre>
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed">
                  💡 <em>Petunjuk Admin:</em> Salin script di atas lalu jalankan di menu <strong>SQL Editor</strong> di dashboard Supabase Anda. Selama tabel dipersiapkan, aplikasi secara otomatis mencadangkan seluruh data catatan ke Cloud Firestore & Local Cache sehingga guru dapat langsung bekerja tanpa hambatan.
                </p>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-end pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
