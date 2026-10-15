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
  AlertTriangle,
  ShieldAlert,
  Download,
  ZoomIn,
  Maximize2,
} from 'lucide-react';
import { getLocalBranding, AppBranding } from '../../services/brandingStorage';
import { sendAnalysisSubmission } from '../../services/analysisSubmissionService';
import { getActiveTeacherSession, normalizeTeacherName } from '../../services/teacherStorage';
import { getEraporHomeroomForClass } from '../../services/analysis/eraporHomeroomBridge';
import { MASTER_CLASSES } from '../../data/masterExamData';
import { isAdminLoggedIn } from '../../services/auth';

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

  const activeSession = getActiveTeacherSession();
  const isAdmin = isAdminLoggedIn();

  // Cari wali kelas resmi dari e-Rapor dan Master Classes
  const officialHomeroom =
    getEraporHomeroomForClass(classId) ||
    MASTER_CLASSES.find((c) => c.id.toUpperCase() === (classId || '').toUpperCase())?.waliKelas ||
    '';

  const isHomeroomMismatch = Boolean(
    !isAdmin &&
    submissionType === 'session' &&
    activeSession?.name &&
    officialHomeroom &&
    normalizeTeacherName(activeSession.name) !== normalizeTeacherName(officialHomeroom) &&
    !(activeSession.loginAliases || []).some(
      (a) => normalizeTeacherName(a) === normalizeTeacherName(officialHomeroom)
    )
  );

  const handleSend = async () => {
    if (isHomeroomMismatch) {
      setErrorMessage(
        `Peringatan Otoritas: Anda login sebagai ${activeSession?.name}, sedangkan Wali Kelas resmi untuk ${className} adalah ${officialHomeroom}. Setoran paket kelas hanya dapat dikirim oleh Wali Kelas yang bersangkutan agar tidak menimpa nilai mapel lain. Silakan gunakan mode Guru Bidang untuk menyetorkan nilai mapel yang Anda ampu.`
      );
      return;
    }

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
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSending) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 text-slate-800 max-h-[92vh] overflow-y-auto font-sans">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-slate-900">Kirim ke Pak Zaki</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-200">
                  Langsung
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Setorkan lembar analisis soal langsung ke sistem Pak Zaki
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSending}
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-all disabled:opacity-50 shadow-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Banner */}
        {isSuccess ? (
          <div className="py-8 text-center space-y-3 animate-[scaleIn_200ms_ease-out]">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-400 text-emerald-600 mx-auto flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Alhamdulillah, Berhasil Terkirim!</h4>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              Lembar analisis <strong className="text-emerald-700">{subjectName}</strong> untuk{' '}
              <strong className="text-slate-900">{className}</strong> telah berhasil disetorkan langsung ke Pak Zaki.
            </p>
          </div>
        ) : (
          <>
            {/* Warning Banner: Proteksi Otoritas Wali Kelas */}
            {isHomeroomMismatch && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2 shadow-xs">
                <div className="flex items-center gap-2 font-black text-rose-900 text-sm">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Proteksi Setoran: Pembatasan Wewenang Wali Kelas</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-700">
                  Anda saat ini login sebagai <strong className="text-slate-900 font-bold">{activeSession?.name}</strong>, sedangkan Wali Kelas resmi untuk <strong className="text-slate-900 font-bold">{className}</strong> adalah <strong className="text-emerald-800 font-bold">{officialHomeroom}</strong>.
                </p>
                <p className="text-[11px] leading-relaxed text-amber-900 font-medium bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  🛡️ <strong>Perlindungan Nilai Siswa:</strong> Pengiriman paket analisis lengkap kelas ini dinonaktifkan demi keamanan data, agar rekap nilai mata pelajaran milik guru atau wali kelas lain tidak terhapus atau tertimpa secara tidak sengaja.
                </p>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  💡 <strong>Solusi:</strong> Jika Anda mengajar di kelas ini (misalnya mapel Qur'an Hadits), silakan tutup jendela ini lalu gunakan mode <strong className="text-sky-700 font-bold">Guru Bidang</strong> untuk menyetorkan nilai mapel yang Anda ampu saja.
                </p>
              </div>
            )}

            {/* Summary Data Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                  Mata Pelajaran:
                </span>
                <span className="font-bold text-slate-800">{subjectName}</span>
              </div>

              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-sky-600" />
                  Kelas:
                </span>
                <span className="font-bold text-sky-700">{className}</span>
              </div>

              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  Asesmen &amp; Tahun:
                </span>
                <span className="font-bold text-slate-700">
                  {examType} • {schoolYear}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  Kelengkapan Nilai:
                </span>
                <span className="font-bold text-emerald-700">
                  {completedStudents} dari {totalStudents} Siswa
                  {averageGrade !== undefined ? ` • Rerata ${averageGrade}` : ''}
                </span>
              </div>
            </div>

            {/* Traktir Kopi Pak Zaki (QRIS Toggle Button) */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0 shadow-xs">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <span>Traktir Kopi Pak Zaki?</span>
                      <Sparkles className="w-3 h-3 text-amber-600" />
                    </h5>
                    <p className="text-[10px] text-amber-800/80 truncate">
                      Apresiasi sukarela untuk admin / pengembang sistem
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowQris(!showQris)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 ${
                    showQris
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                      : 'bg-white hover:bg-amber-100/70 text-amber-900 border-amber-200 shadow-xs'
                  }`}
                >
                  {showQris ? 'Tutup QRIS' : '☕ Buka QRIS'}
                </button>
              </div>

              {/* Collapsible QRIS Card */}
              {showQris && (
                <div className="pt-2 border-t border-amber-200/80 text-center space-y-3 animate-[fadeIn_150ms_ease-out]">
                  <p className="text-[11px] text-slate-600 leading-relaxed italic">
                    &quot;Terima kasih sudah meringankan pekerjaan administrasi sekolah hari ini! Jika berkenan mentraktir segelas es kopi untuk Pak Zaki, silakan scan barcode QRIS di bawah ini ya~ (100% sukarela)&quot;
                  </p>

                  <div
                    onClick={() => setIsZoomedQris(true)}
                    className="group relative inline-block p-3 bg-white rounded-2xl shadow-md border-2 border-amber-300 cursor-pointer transition-transform hover:scale-[1.02]"
                    title="Klik untuk memperbesar barcode QRIS"
                  >
                    {/* Hover Zoom Overlay */}
                    <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center gap-1 text-white text-xs font-bold backdrop-blur-[1px]">
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
                      <div className="w-48 h-48 bg-slate-50 flex flex-col items-center justify-center p-3 text-slate-800 rounded-lg border border-slate-200">
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
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>🔍 Perbesar QRIS</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadQris}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>📥 Unduh QRIS</span>
                    </button>
                  </div>

                  <div className="text-[10px] text-amber-900/80 font-medium">
                    {branding.personalQrisMerchantName || 'Dukungan Pengembang / Admin'} •{' '}
                    {branding.personalQrisBankName || 'Semua Bank & E-Wallet (QRIS)'}
                  </div>
                </div>
              )}
            </div>

            {/* Catatan Guru (Opsional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                  Catatan untuk Pak Zaki (Opsional)
                </span>
                <span className="text-[10px] text-slate-400">Opsional</span>
              </label>
              <textarea
                value={teacherNote}
                onChange={(e) => setTeacherNote(e.target.value)}
                placeholder="Contoh: Pak Zaki, analisis nilai sudah selesai, ada 2 siswa remedial yang sudah tuntas..."
                rows={2}
                disabled={isSending}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white resize-none transition-colors"
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isSending}
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isSending || isHomeroomMismatch}
                onClick={handleSend}
                className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                  isHomeroomMismatch
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-sm cursor-pointer disabled:opacity-50'
                }`}
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Sedang Mengirim...</span>
                  </>
                ) : isHomeroomMismatch ? (
                  <>
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span>Setoran Dikunci (Bukan Wali Kelas)</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-white" />
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
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
          onClick={() => setIsZoomedQris(false)}
        >
          <div
            className="relative w-full max-w-sm bg-white border-2 border-amber-300 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-800 text-center animate-[scaleIn_200ms_ease-out] font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Zoom Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">Barcode QRIS Pak Zaki</h4>
                  <p className="text-[10px] text-amber-800">Scan langsung atau simpan gambar ke perangkat</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsZoomedQris(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* High-Resolution QR Card */}
            <div className="p-4 bg-white rounded-2xl shadow-md border-2 border-amber-300 inline-block w-full max-w-[280px]">
              {branding.personalQrisImageUrl ? (
                <img
                  src={branding.personalQrisImageUrl}
                  alt="QRIS Pak Zaki"
                  className="w-full h-auto object-contain mx-auto rounded-lg"
                />
              ) : (
                <div className="w-full aspect-square bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-800 rounded-lg border border-slate-200">
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
              <div className="text-xs font-bold text-slate-900">
                {branding.personalQrisMerchantName || 'QRIS PAK ZAKI'}
              </div>
              <div className="text-[11px] text-amber-800 font-mono font-bold">
                NMID: {branding.personalQrisNmid || 'ID1020304050607'}
              </div>
              <div className="text-[10px] text-slate-500">
                {branding.personalQrisBankName || 'Mendukung BCA, Mandiri, BRI, BSI, GoPay, OVO, DANA, ShopeePay, dll'}
              </div>
            </div>

            {/* Zoom Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleDownloadQris}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>📥 Unduh Gambar QRIS</span>
              </button>
              <button
                type="button"
                onClick={() => setIsZoomedQris(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer shadow-xs"
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
