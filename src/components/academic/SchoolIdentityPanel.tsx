import React, { useState, useEffect } from 'react';
import {
  School,
  Save,
  Check,
  RotateCcw,
  Loader2,
  Calendar,
  Award,
  Users,
  Building2,
  FileText,
  Percent,
} from 'lucide-react';
import {
  RaporStsConfig,
  TeacherProfile,
  DEFAULT_CLASS_TEACHERS,
} from '../../types/raporSts';
import {
  fetchGlobalRaporConfig,
  saveGlobalRaporConfig,
} from '../../services/raporStsService';

interface SchoolIdentityPanelProps {
  showNotification?: (message: string, type?: 'success' | 'info') => void;
}

const CLASS_LIST = [
  '1A', '1B', '2A', '2B', '2C', '3A', '3B', '3C',
  '4A', '4B', '5A', '5B', '6A', '6B',
];

const DEFAULT_CONFIG_FALLBACK: RaporStsConfig = {
  schoolName: 'SDIT AL FIKRI',
  npsn: '69992019',
  schoolAddress: 'Jl. Raden Saleh No. 56, Sukmajaya, Kota Depok, Jawa Barat',
  headmasterName: 'Ahmad Fikri, S.Pd.I.',
  headmasterNip: '-',
  teacherName: 'Guru Kelas',
  teacherNip: '-',
  classLevel: '1',
  fase: 'Fase A',
  semester: '2',
  schoolYear: '2024/2025',
  reportDatePlace: 'Depok, 20 Maret 2025',
  passingGrade: 75,
  tpWeight: 50,
  stsWeight: 50,
  classTeachers: DEFAULT_CLASS_TEACHERS,
};

export const SchoolIdentityPanel: React.FC<SchoolIdentityPanelProps> = ({
  showNotification,
}) => {
  const [config, setConfig] = useState<RaporStsConfig>(DEFAULT_CONFIG_FALLBACK);
  const [classTeachers, setClassTeachers] = useState<Record<string, TeacherProfile>>(DEFAULT_CLASS_TEACHERS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'identity' | 'walas'>('identity');

  // Load initial global config
  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      try {
        const globalData = await fetchGlobalRaporConfig();
        if (globalData) {
          setConfig((prev) => ({
            ...prev,
            ...globalData,
          }));
          if (globalData.classTeachers && Object.keys(globalData.classTeachers).length > 0) {
            setClassTeachers({
              ...DEFAULT_CLASS_TEACHERS,
              ...globalData.classTeachers,
            });
          }
        }
      } catch (err) {
        console.error('Error loading global rapor config:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleUpdateWalas = (cls: string, field: 'name' | 'nip', value: string) => {
    setClassTeachers((prev) => ({
      ...prev,
      [cls]: {
        ...(prev[cls] || { name: '', nip: '' }),
        [field]: value,
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedConfig: Partial<RaporStsConfig> = {
        schoolName: config.schoolName,
        npsn: config.npsn,
        schoolAddress: config.schoolAddress,
        headmasterName: config.headmasterName,
        headmasterNip: config.headmasterNip,
        reportDatePlace: config.reportDatePlace,
        passingGrade: Number(config.passingGrade) || 75,
        tpWeight: Number(config.tpWeight) || 50,
        stsWeight: Number(config.stsWeight) || 50,
        printOnlyPage1: Boolean(config.printOnlyPage1),
        classTeachers,
      };

      await saveGlobalRaporConfig(updatedConfig);
      showNotification?.('Pengaturan identitas sekolah & format rapor berhasil disimpan ke Cloud.', 'success');
    } catch (err: any) {
      console.error('Error saving global rapor config:', err);
      showNotification?.(err?.message || 'Gagal menyimpan pengaturan identitas sekolah.', 'info');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Kembalikan data identitas sekolah ke nilai bawaan SDIT AL FIKRI?')) {
      setConfig(DEFAULT_CONFIG_FALLBACK);
      setClassTeachers(DEFAULT_CLASS_TEACHERS);
      showNotification?.('Data telah dikembalikan ke format standar. Klik Simpan untuk memperbarui ke Cloud.', 'info');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm font-semibold">Memuat data identitas sekolah & format rapor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Subtab Navigator */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveSubTab('identity')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'identity'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Identitas Sekolah & Titimangsa</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('walas')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'walas'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Daftar Wali Kelas Rombel ({CLASS_LIST.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Muat nilai bawaan standar"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Standar Bawaan</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-emerald-700/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'identity' ? (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Kolom Kiri: Lembaga & Kop Rapor */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-xs">
                  <School className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Identitas Satuan Pendidikan</h3>
                  <p className="text-[11px] text-slate-500">Dicantumkan pada kop resmi cetak e-Rapor dan dokumen nilai</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Nama Sekolah</label>
                  <input
                    type="text"
                    value={config.schoolName}
                    onChange={(e) => setConfig({ ...config, schoolName: e.target.value })}
                    placeholder="SDIT AL FIKRI"
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-slate-900 font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 placeholder:text-slate-400"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">NPSN</label>
                  <input
                    type="text"
                    value={config.npsn}
                    onChange={(e) => setConfig({ ...config, npsn: e.target.value })}
                    placeholder="69992019"
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-slate-900 font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 placeholder:text-slate-400"
                    required
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-bold text-slate-700">Alamat Lengkap Sekolah</label>
                  <textarea
                    rows={2}
                    value={config.schoolAddress}
                    onChange={(e) => setConfig({ ...config, schoolAddress: e.target.value })}
                    placeholder="Jl. Raden Saleh No. 56, Sukmajaya, Kota Depok"
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-slate-900 font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 placeholder:text-slate-400 resize-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Pimpinan & Tanda Tangan */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shadow-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Kepala Sekolah & Titimangsa Rapor</h3>
                  <p className="text-[11px] text-slate-500">Pimpinan yang menandatangani lembar rapor dan tanggal terbit</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Nama Kepala Sekolah (Lengkap dengan Gelar)</label>
                  <input
                    type="text"
                    value={config.headmasterName}
                    onChange={(e) => setConfig({ ...config, headmasterName: e.target.value })}
                    placeholder="Ahmad Fikri, S.Pd.I."
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-slate-900 font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 placeholder:text-slate-400"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">NIP / NUPTK Kepala Sekolah</label>
                  <input
                    type="text"
                    value={config.headmasterNip}
                    onChange={(e) => setConfig({ ...config, headmasterNip: e.target.value })}
                    placeholder="-"
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-slate-900 font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 placeholder:text-slate-400"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-bold text-slate-700 flex items-center justify-between">
                    <span>Tempat & Tanggal Titimangsa Rapor</span>
                    <span className="text-[10px] text-slate-400 font-normal">Contoh: Depok, 20 Maret 2025</span>
                  </label>
                  <input
                    type="text"
                    value={config.reportDatePlace}
                    onChange={(e) => setConfig({ ...config, reportDatePlace: e.target.value })}
                    placeholder="Depok, 20 Maret 2025"
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-slate-900 font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Parameter Penilaian & KKM */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-xs">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Standar & Bobot Nilai</h3>
                  <p className="text-[11px] text-slate-500">Ketuntasan Kriteria Tujuan Pembelajaran</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 flex items-center justify-between">
                    <span>KKTP / KKM Minimal</span>
                    <span className="text-emerald-700 font-bold">{config.passingGrade}</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={config.passingGrade}
                    onChange={(e) => setConfig({ ...config, passingGrade: parseInt(e.target.value, 10) || 75 })}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-slate-900 font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-500">
                    Nilai di bawah angka ini akan otomatis dikategorikan "Perlu Bimbingan".
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Pembobotan Nilai Akhir Rapor</span>
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-600">Rerata Formatif (TP)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={config.tpWeight ?? 50}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setConfig({ ...config, tpWeight: val, stsWeight: 100 - val });
                          }}
                          className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-slate-900 font-bold text-center pr-6 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        />
                        <span className="absolute right-2.5 top-1.5 text-slate-400 font-bold">%</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-600">Sumatif (STS)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={config.stsWeight ?? 50}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setConfig({ ...config, stsWeight: val, tpWeight: 100 - val });
                          }}
                          className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-slate-900 font-bold text-center pr-6 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        />
                        <span className="absolute right-2.5 top-1.5 text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Formula Rapor STS = (TP × {config.tpWeight ?? 50}%) + (STS × {config.stsWeight ?? 50}%).
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Format Lembar Rapor</span>
                  </p>
                  <label className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors text-[11px] text-slate-700 select-none">
                    <input
                      type="checkbox"
                      checked={!!config.printOnlyPage1}
                      onChange={(e) => setConfig({ ...config, printOnlyPage1: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-500/30 border-slate-300 cursor-pointer"
                    />
                    <div className="leading-tight">
                      <p className="font-bold text-slate-900">Cetak Hanya Lembar 1</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Sembunyikan lembar ke-2 (Karakter) & fitur input terkait</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Quick Summary Card */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-xs space-y-2">
              <h4 className="font-bold text-emerald-900">Sinkronisasi Otomatis</h4>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Perubahan pada halaman ini akan langsung disinkronkan ke Firestore. Semua guru dan halaman cetak rapor kelas otomatis menggunakan kop dan titimangsa ini.
              </p>
            </div>
          </div>
        </form>
      ) : (
        /* Subtab 2: Daftar Wali Kelas per Rombel */
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Daftar Wali Kelas per Rombel</h3>
              <p className="text-[11px] text-slate-500">
                Nama dan NIP wali kelas otomatis tercetak pada lembar pengesahan rapor siswa di masing-masing rombel
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
              {CLASS_LIST.length} Rombel Terkonfigurasi
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4 font-bold w-20 text-center">Rombel</th>
                    <th className="py-3 px-4 font-bold">Nama Wali Kelas (Gelar Lengkap)</th>
                    <th className="py-3 px-4 font-bold w-64">NIP / NUPTK</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {CLASS_LIST.map((cls) => {
                    const teacher = classTeachers[cls] || { name: '', nip: '' };
                    return (
                      <tr key={cls} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-xs">
                            {cls}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            placeholder={`Nama Wali Kelas ${cls}`}
                            value={teacher.name}
                            onChange={(e) => handleUpdateWalas(cls, 'name', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-slate-900 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-xs"
                          />
                        </td>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            placeholder="NIP / - "
                            value={teacher.nip}
                            onChange={(e) => handleUpdateWalas(cls, 'nip', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-slate-900 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-xs"
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
      )}
    </div>
  );
};

export default SchoolIdentityPanel;
