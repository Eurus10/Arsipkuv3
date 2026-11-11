import React, { useState } from 'react';
import {
  X,
  FolderOpen,
  FileSpreadsheet,
  ArrowRightLeft,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { MasterClass } from '../../data/masterExamData';
import { Student } from '../../services/studentStorage';
import { AnalysisSession } from '../../types/analysisTypes';
import { fetchSessionByTransferCode } from '../../services/analysis/analysisTransferService';
import { PillStepper } from './PillStepper';

interface RestoreAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterClasses: MasterClass[];
  students: Student[];
  onOpenImportExcel: () => void;
  onRestoreSession: (session: AnalysisSession) => void;
  onDownloadBlankExcel: (params: {
    classId: string;
    pgCount: number;
    isianCount: number;
    cType: 'Essay/Uraian' | 'Menjodohkan';
    cCount: number;
  }) => void;
}

export const RestoreAnalysisModal: React.FC<RestoreAnalysisModalProps> = ({
  isOpen,
  onClose,
  masterClasses,
  students,
  onOpenImportExcel,
  onRestoreSession,
  onDownloadBlankExcel,
}) => {
  const [activeTab, setActiveTab] = useState<'EXCEL' | 'TARIK' | 'BLANK'>('EXCEL');

  // State Tarik Analisis
  const [transferCode, setTransferCode] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullStatus, setPullStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // State Template Kosong
  const [blankClassId, setBlankClassId] = useState<string>(() => {
    return masterClasses.length > 0 ? masterClasses[0].id : '';
  });
  const [blankPgCount, setBlankPgCount] = useState<number>(25);
  const [blankIsianCount, setBlankIsianCount] = useState<number>(10);
  const [blankTypeC, setBlankTypeC] = useState<'Essay/Uraian' | 'Menjodohkan'>('Essay/Uraian');
  const [blankCCount, setBlankCCount] = useState<number>(5);

  if (!isOpen) return null;

  const handlePullSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = transferCode.trim().replace(/[^0-9]/g, '');
    if (cleanCode.length !== 6) {
      setPullStatus({
        type: 'error',
        message: 'Masukkan 6 digit kode tarik yang valid (contoh: 482910).',
      });
      return;
    }

    setIsPulling(true);
    setPullStatus(null);

    try {
      const result = await fetchSessionByTransferCode(cleanCode);
      setPullStatus({
        type: 'success',
        message: `Berhasil menarik sesi Kelas ${result.session.className || result.session.classId} (${result.session.examType}) dari ${result.deviceInfo || 'perangkat lain'}.`,
      });

      setTimeout(() => {
        onRestoreSession(result.session);
        onClose();
      }, 1000);
    } catch (err: any) {
      setPullStatus({
        type: 'error',
        message: err?.message || 'Gagal menarik sesi analisis. Periksa kode Anda dan coba lagi.',
      });
    } finally {
      setIsPulling(false);
    }
  };

  const handleBlankDownloadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blankClassId) {
      alert('Silakan pilih kelas terlebih dahulu.');
      return;
    }
    onDownloadBlankExcel({
      classId: blankClassId,
      pgCount: blankPgCount,
      isianCount: blankIsianCount,
      cType: blankTypeC,
      cCount: blankCCount,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_150ms_ease-out] font-sans"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-2xl text-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header Modal */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100/70 border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Buka / Pulihkan Analisis
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih metode pembukaan file atau pemindahan sesi antar perangkat
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            title="Tutup dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sleek Top Navigation Bar with 3 Tab Buttons */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('EXCEL');
              setPullStatus(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'EXCEL'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>Import Excel</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('TARIK');
              setPullStatus(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'TARIK'
                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 shrink-0" />
            <span>Tarik Analisis</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('BLANK');
              setPullStatus(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'BLANK'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Template Kosong</span>
          </button>
        </div>

        {/* Modal Body: Active Tab Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-white">
          {/* ====================================================
              MENU 1: IMPORT DARI EXCEL
              ==================================================== */}
          {activeTab === 'EXCEL' && (
            <div className="space-y-4 animate-[fadeIn_150ms_ease-out]">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    Pulihkan Proyek Analisis dari File Excel (.xlsx)
                  </h4>
                  </div>
              </div>

              <div className="p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30 transition-all text-center space-y-3">
                <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto" />
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Buka File Excel Proyek Analisis
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mendukung file unduhan dari Mode Wali Kelas maupun Mode Guru Bidang
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenImportExcel();
                      onClose();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>Pilih Berkas Excel & Buka</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================
              MENU 2: TARIK ANALISIS (PINDAH HP ↔ LAPTOP VIA KODE)
              ==================================================== */}
          {activeTab === 'TARIK' && (
            <div className="space-y-4 animate-[fadeIn_150ms_ease-out]">
              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0 mt-0.5">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                      Tarik Sesi Analisis Antar-Perangkat Secara Instan
                    </h4>
                  </div>
                </div>
              </div>

              {/* Input Kode 6 Digit */}
              <form onSubmit={handlePullSession} className="space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                    Masukkan 6-Digit Kode Tarik dari HP / Perangkat Lain
                  </label>

                  <div className="relative max-w-sm mx-auto">
                    <input
                      type="text"
                      maxLength={6}
                      value={transferCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setTransferCode(val);
                        setPullStatus(null);
                      }}
                      placeholder="Contoh: 784920"
                      className="w-full text-center text-2xl sm:text-3xl font-mono font-black tracking-[0.35em] bg-white border-2 border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 rounded-2xl px-4 py-3 outline-none transition-all placeholder:text-slate-300 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                      autoFocus
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 text-center font-medium">
                    Kode ini didapatkan dengan menekan tombol <strong>"Kode Tarik"</strong> pada sesi analisis di HP atau perangkat lain Anda.
                  </p>
                </div>

                {pullStatus && (
                  <div
                    className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-medium leading-relaxed ${
                      pullStatus.type === 'success'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                    }`}
                  >
                    {pullStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span>{pullStatus.message}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <button
                    type="submit"
                    disabled={isPulling || transferCode.length !== 6}
                    className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs shadow-sm active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isPulling ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menghubungkan & Menarik Data...</span>
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft className="w-4 h-4" />
                        <span>Tarik & Pulihkan Sesi ke Perangkat Ini</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Info Kuota Hemat */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                <span className="font-bold text-slate-800">Masa aktif: 24 Jam</span>
              </div>
            </div>
          )}

          {/* ====================================================
              MENU 3: UNDUH TEMPLATE KOSONG (LEGACY BLANK)
              ==================================================== */}
          {activeTab === 'BLANK' && (
            <form onSubmit={handleBlankDownloadSubmit} className="space-y-4 animate-[fadeIn_150ms_ease-out]">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0 mt-0.5">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                    Unduh Format Blanko Excel Kosong (Tanpa Mengisi Nilai di Web)
                  </h4>
                </div>
              </div>

              {/* 1. Pilih Kelas */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Pilih Rombel Kelas
                </label>
                <select
                  value={blankClassId}
                  onChange={(e) => setBlankClassId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                >
                  {masterClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      Kelas {c.name || c.id} {c.waliKelas ? `— ${c.waliKelas}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Konfigurasi Butir Soal */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Pilihan Ganda (PG)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={blankPgCount}
                    onChange={(e) => setBlankPgCount(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400">Default resmi: 25</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Isian Singkat</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={blankIsianCount}
                    onChange={(e) => setBlankIsianCount(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400">Default resmi: 10</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Uraian / Menjodohkan</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={blankCCount}
                    onChange={(e) => setBlankCCount(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400">Default resmi: 5</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Berkas Template Excel Kosong</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all shadow-2xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
