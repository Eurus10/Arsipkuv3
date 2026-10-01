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
  Download,
  ZoomIn,
  Maximize2,
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
  const [isZoomedQris, setIsZoomedQris] = useState<boolean>(false);
  const [teacherNote, setTeacherNote] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDownloadQris = () => {
    if (branding.personalQrisImageUrl) {
      const link = document.createElement('a');
      link.href = branding.personalQrisImageUrl;
      link.download = `QRIS-Pak-Zaki-${(branding.personalQrisMerchantName || 'Apresiasi').replace(/\s+/g, '-')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Generate canvas if image URL is not explicitly configured
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 700;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Header
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(branding.personalQrisMerchantName || 'QRIS PAK ZAKI', 300, 80);

        ctx.fillStyle = '#64748b';
        ctx.font = '20px monospace';
        ctx.fillText(`NMID: ${branding.personalQrisNmid || 'ID1020304050607'}`, 300, 120);

        // Box
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.strokeRect(100, 160, 400, 400);

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText('QRIS APRESIASI', 300, 360);

        // Footer
        ctx.fillStyle = '#475569';
        ctx.font = '18px sans-serif';
        ctx.fillText(branding.personalQrisBankName || 'Semua Bank & E-Wallet (QRIS)', 300, 620);

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'QRIS-Pak-Zaki.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  if (!isOpen) return null;

  const handleSend = async () => {
    setIsSending(true);
    setErrorMessage(null);

    try {
      const activeSession = getActiveTeacherSession();
      await sendAnalysisSubmission({
        submissionType,
        subjectName,
        classId,
        className,
        examType,
        schoolYear,
        teacherId: activeSession?.id,
        teacherRoleTitle: activeSession?.roleTitle,
        teacherName:
          activeSession?.name ||
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

                  <div
                    onClick={() => setIsZoomedQris(true)}
                    className="group relative inline-block p-3 bg-white rounded-2xl shadow-xl border-2 border-amber-400 cursor-pointer transition-transform hover:scale-[1.02]"
                    title="Klik untuk memperbesar barcode QRIS"
                  >
                    {/* Hover Zoom Overlay */}
                    <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center gap-1 text-white text-xs font-bold backdrop-blur-[1px]">
                      <ZoomIn className="w-5 h-5 text-amber-300" />
                      <span>Klik untuk Perbesar</span>
                    </div>

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

                  {/* QRIS Action Buttons: Zoom & Download */}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsZoomedQris(true)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer hover:border-amber-400"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>🔍 Perbesar QRIS</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadQris}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>📥 Unduh QRIS</span>
                    </button>
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

      {/* Full Zoomed QRIS Modal Overlay */}
      {isZoomedQris && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-[fadeIn_150ms_ease-out]"
          onClick={() => setIsZoomedQris(false)}
        >
          <div
            className="relative w-full max-w-sm bg-slate-900 border-2 border-amber-400/80 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100 text-center animate-[scaleIn_200ms_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Zoom Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">Barcode QRIS Pak Zaki</h4>
                  <p className="text-[10px] text-amber-300/80">Scan langsung atau simpan gambar ke perangkat</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsZoomedQris(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* High-Resolution QR Card */}
            <div className="p-4 bg-white rounded-2xl shadow-xl border-2 border-amber-400 inline-block w-full max-w-[280px]">
              {branding.personalQrisImageUrl ? (
                <img
                  src={branding.personalQrisImageUrl}
                  alt="QRIS Pak Zaki"
                  className="w-full h-auto object-contain mx-auto rounded-lg"
                />
              ) : (
                <div className="w-full aspect-square bg-slate-100 flex flex-col items-center justify-center p-4 text-slate-800 rounded-lg">
                  <QrCode className="w-24 h-24 text-slate-700 mb-2" />
                  <span className="text-xs font-black uppercase text-center leading-tight">
                    {branding.personalQrisMerchantName || 'QRIS PAK ZAKI'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 font-mono font-bold">
                    NMID: {branding.personalQrisNmid || 'ID1020304050607'}
                  </span>
                </div>
              )}
            </div>

            {/* Info details */}
            <div className="space-y-1">
              <div className="text-xs font-bold text-white">
                {branding.personalQrisMerchantName || 'QRIS PAK ZAKI'}
              </div>
              <div className="text-[11px] text-amber-300 font-mono font-bold">
                NMID: {branding.personalQrisNmid || 'ID1020304050607'}
              </div>
              <div className="text-[10px] text-slate-400">
                {branding.personalQrisBankName || 'Mendukung BCA, Mandiri, BRI, BSI, GoPay, OVO, DANA, ShopeePay, dll'}
              </div>
            </div>

            {/* Zoom Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleDownloadQris}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>📥 Unduh Gambar QRIS</span>
              </button>
              <button
                type="button"
                onClick={() => setIsZoomedQris(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
