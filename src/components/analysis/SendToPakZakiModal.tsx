import React, { useState } from 'react';
import {
  Send,
  Coffee,
  X,
  CheckCircle2,
  Loader2,
  Sparkles,
  QrCode,
  Heart,
  FileSpreadsheet,
  Users,
  GraduationCap,
  Calendar,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { getLocalBranding, AppBranding } from '../../services/brandingStorage';
import { sendAnalysisSubmission } from '../../services/analysisSubmissionService';
import { getActiveTeacherSession } from '../../services/teacherStorage';

interface SendToPakZakiModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionType: 'single_class' | 'multi_class' | 'session';
  subjectName: string;
  classId: string;
  className: string;
  examType: string;
  schoolYear: string;
  teacherName: string;
  kktp: number;
  totalStudents: number;
  completedStudents: number;
  passedStudents?: number;
  averageGrade?: number;
  payload: any;
  onSuccess?: () => void;
}

export const SendToPakZakiModal: React.FC<SendToPakZakiModalProps> = ({
  isOpen,
  onClose,
  submissionType,
  subjectName,
  classId,
  className,
  examType,
  schoolYear,
  teacherName,
  kktp,
  totalStudents,
  completedStudents,
  passedStudents,
  averageGrade,
  payload,
  onSuccess,
}) => {
  const [branding] = useState<AppBranding>(() => getLocalBranding());
  const [showQris, setShowQris] = useState<boolean>(false);
  const [teacherNote, setTeacherNote] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = async () => {
    setIsSending(true);
    setErrorMessage(null);

    try {
      await sendAnalysisSubmission({
        submissionType,
        subjectName,
        classId,
        className,
        examType,
        schoolYear,
        teacherName:
          getActiveTeacherSession()?.name ||
          teacherName ||
          branding.personalName ||
          'Guru Pengampu',
        kktp,
        totalStudents,
        completedStudents,
        passedStudents,
        averageGrade,
        teacherNote: teacherNote.trim() || undefined,
        payload,
      });

      setIsSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error('Failed to send analysis to Pak Zaki:', err);
      setErrorMessage(
        err?.message || 'Gagal mengirim ke Pak Zaki. Pastikan perangkat terhubung internet.'
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-[fadeIn_150ms_ease-out]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSending) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-white/10 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-white">Kirim ke Pak Zaki</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30">
                  Langsung
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Setorkan lembar analisis soal langsung ke sistem Pak Zaki
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSending}
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Banner */}
        {isSuccess ? (
          <div className="py-8 text-center space-y-3 animate-[scaleIn_200ms_ease-out]">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white">Alhamdulillah, Berhasil Terkirim!</h4>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              Lembar analisis <strong className="text-emerald-300">{subjectName}</strong> untuk{' '}
              <strong className="text-white">{className}</strong> telah berhasil disetorkan langsung ke Pak Zaki.
            </p>
          </div>
        ) : (
          <>
            {/* Summary Data Card */}
            <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
                  Mata Pelajaran:
                </span>
                <span className="font-bold text-white">{subjectName}</span>
              </div>

              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
                  Kelas:
                </span>
                <span className="font-bold text-sky-300">{className}</span>
              </div>

              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  Asesmen & Tahun:
                </span>
                <span className="font-bold text-slate-200">
                  {examType} • {schoolYear}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  Kelengkapan Nilai:
                </span>
                <span className="font-bold text-emerald-300">
                  {completedStudents} dari {totalStudents} Siswa
                  {averageGrade !== undefined ? ` • Rerata ${averageGrade}` : ''}
                </span>
              </div>
            </div>

            {/* Traktir Kopi Pak Zaki (QRIS Toggle Button) */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0 shadow-sm">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                      <span>Traktir Kopi Pak Zaki?</span>
                      <Sparkles className="w-3 h-3 text-amber-400" />
                    </h5>
                    <p className="text-[10px] text-amber-300/70 truncate">
                      Apresiasi sukarela untuk admin / pengembang sistem
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowQris(!showQris)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 ${
                    showQris
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border-amber-500/30'
                  }`}
                >
                  {showQris ? 'Tutup QRIS' : '☕ Buka QRIS'}
                </button>
              </div>

              {/* Collapsible QRIS Card */}
              {showQris && (
                <div className="pt-2 border-t border-amber-500/20 text-center space-y-3 animate-[fadeIn_150ms_ease-out]">
                  <p className="text-[11px] text-slate-300 leading-relaxed italic">
                    "Terima kasih sudah meringankan pekerjaan administrasi sekolah hari ini! Jika berkenan mentraktir segelas es kopi untuk Pak Zaki, silakan scan barcode QRIS di bawah ini ya~ (100% sukarela)"
                  </p>

                  <div className="inline-block p-3 bg-white rounded-2xl shadow-xl border-2 border-amber-400">
                    {branding.personalQrisImageUrl ? (
                      <img
                        src={branding.personalQrisImageUrl}
                        alt="QRIS Pak Zaki"
                        className="w-48 h-48 object-contain mx-auto rounded-lg"
                      />
                    ) : (
                      <div className="w-48 h-48 bg-slate-100 flex flex-col items-center justify-center p-3 text-slate-800 rounded-lg">
                        <QrCode className="w-16 h-16 text-slate-700 mb-2" />
                        <span className="text-[11px] font-black uppercase text-center leading-tight">
                          {branding.personalQrisMerchantName || 'QRIS PAK ZAKI'}
                        </span>
                        <span className="text-[9px] text-slate-500 mt-1 font-mono">
                          NMID: {branding.personalQrisNmid || 'ID1020304050607'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-amber-300/80 font-medium">
                    {branding.personalQrisMerchantName || 'Dukungan Pengembang / Admin'} •{' '}
                    {branding.personalQrisBankName || 'Semua Bank & E-Wallet (QRIS)'}
                  </div>
                </div>
              )}
            </div>

            {/* Catatan Guru (Opsional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  Catatan untuk Pak Zaki (Opsional)
                </span>
                <span className="text-[10px] text-slate-500">Opsional</span>
              </label>
              <textarea
                value={teacherNote}
                onChange={(e) => setTeacherNote(e.target.value)}
                placeholder="Contoh: Pak Zaki, analisis nilai sudah selesai, ada 2 siswa remedial yang sudah tuntas..."
                rows={2}
                disabled={isSending}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none transition-colors"
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                disabled={isSending}
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isSending}
                onClick={handleSend}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Sedang Mengirim...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>🚀 Kirim Sekarang ke Pak Zaki</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
