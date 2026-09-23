import React, { useState, useEffect } from 'react';
import {
  X,
  School,
  UserCheck,
  Check,
  Save,
  Lock,
} from 'lucide-react';
import {
  RaporStsConfig,
  TeacherProfile,
  DEFAULT_CLASS_TEACHERS,
} from '../../types/raporSts';

interface RaporSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: RaporStsConfig;
  activeClass: string;
  gradeLevel: string;
  onSaveConfig: (newConfig: Partial<RaporStsConfig>) => void;
  initialTab?: 'general' | 'pins';
  isAdmin?: boolean;
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
}) => {
  // Form State for General Config
  const [localConfig, setLocalConfig] = useState<RaporStsConfig>(config);
  const [classTeachers, setClassTeachers] = useState<Record<string, TeacherProfile>>(() => {
    return config.classTeachers && Object.keys(config.classTeachers).length > 0
      ? { ...DEFAULT_CLASS_TEACHERS, ...config.classTeachers }
      : { ...DEFAULT_CLASS_TEACHERS };
  });

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalConfig(config);
      setClassTeachers(
        config.classTeachers && Object.keys(config.classTeachers).length > 0
          ? { ...DEFAULT_CLASS_TEACHERS, ...config.classTeachers }
          : { ...DEFAULT_CLASS_TEACHERS }
      );
    }
  }, [isOpen, config]);

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
            Pengaturan kop sekolah, titimangsa, wali kelas, dan PIN kelas hanya dapat dikelola oleh Administrator.
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
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center font-bold">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Pengaturan Format & Administrasi Rapor</h3>
              <p className="text-[11px] text-slate-400">
                Konfigurasi kop sekolah, titimangsa rapor, dan PIN akses per rombel
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

        {notification && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{notification}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          <form id="general-config-form" onSubmit={handleSaveGeneral} className="space-y-5">
              {/* Section 1: Kop Sekolah */}
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

              {/* Section 2: Daftar Wali Kelas per-Rombel */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Daftar Wali Kelas & NIP per Rombel</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Otomatis aktif saat guru memilih kelas
                  </span>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="py-2 px-3 font-bold w-16 text-center">Kelas</th>
                          <th className="py-2 px-3 font-bold">Nama Wali Kelas (Gelar)</th>
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

              {/* Submit Buttons */}
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
                  <span>Simpan Perubahan Data</span>
                </button>
              </div>
            </form>
        </div>
      </div>
    </div>
  );
};
